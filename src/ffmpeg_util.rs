use ffmpeg_next as ffmpeg;

use std::collections::HashMap;
use std::time::Instant;

use ffmpeg::{
    codec, decoder, encoder, format, frame, log, media, picture, Dictionary, Packet, Rational,
};
use ffmpeg_next::software::scaling::{Context, Flags};
use deft::js::JsError;
use serde::{Deserialize, Serialize};

const DEFAULT_X264_OPTS: &str = "preset=medium";

struct Transcoder {
    ost_index: usize,
    decoder: decoder::Video,
    input_time_base: Rational,
    scalar: Context,
    encoder: encoder::Video,
    logging_enabled: bool,
    frame_count: usize,
    last_log_frame_count: usize,
    starting_time: Instant,
    last_log_time: Instant,
}

pub struct TranscodeOptions {
    pub output_height: Option<u32>,
}

impl Transcoder {
    fn new(
        ist: &format::stream::Stream,
        octx: &mut format::context::Output,
        ost_index: usize,
        x264_opts: Dictionary,
        enable_logging: bool,
        options: TranscodeOptions,
    ) -> Result<Self, ffmpeg::Error> {
        let global_header = octx.format().flags().contains(format::Flags::GLOBAL_HEADER);
        let decoder = codec::context::Context::from_parameters(ist.parameters())?
            .decoder()
            .video()?;
        let codec = encoder::find(codec::Id::H264);
        let mut ost = octx.add_stream(codec)?;

        let mut encoder =
            codec::context::Context::new_with_codec(codec.ok_or(ffmpeg::Error::InvalidData)?)
                .encoder()
                .video()?;
        let mut encode_height = options.output_height.unwrap_or(decoder.height());
        if encode_height == 0 {
            encode_height = decoder.height();
        }
        let encode_width = Self::calculate_width(decoder.width(), decoder.height(), encode_height);
        println!("encode size: {} x {}", encode_width, encode_height);
        ost.set_parameters(&encoder);
        encoder.set_height(encode_height);
        encoder.set_width(encode_width);
        encoder.set_aspect_ratio(decoder.aspect_ratio());
        encoder.set_format(decoder.format());
        encoder.set_frame_rate(decoder.frame_rate());
        encoder.set_time_base(ist.time_base());

        if global_header {
            encoder.set_flags(codec::Flags::GLOBAL_HEADER);
        }

        let opened_encoder = encoder
            .open_with(x264_opts)
            .expect("error opening x264 with supplied settings");
        ost.set_parameters(&opened_encoder);

        let scalar = Context::get(
            decoder.format(), decoder.width(), decoder.height(),
            opened_encoder.format(), opened_encoder.width(), opened_encoder.height(), Flags::empty()
        )?;

        Ok(Self {
            ost_index,
            decoder,
            input_time_base: ist.time_base(),
            scalar,
            encoder: opened_encoder,
            logging_enabled: enable_logging,
            frame_count: 0,
            last_log_frame_count: 0,
            starting_time: Instant::now(),
            last_log_time: Instant::now(),
        })
    }

    fn calculate_width(origin_width: u32, origin_height: u32, new_height: u32) -> u32 {
        new_height * origin_width / origin_height
    }

    fn send_packet_to_decoder(&mut self, packet: &Packet) -> Result<(), JsError> {
        self.decoder.send_packet(packet)?;
        Ok(())
    }

    fn send_eof_to_decoder(&mut self) -> Result<(), JsError> {
        self.decoder.send_eof()?;
        Ok(())
    }

    fn receive_and_process_decoded_frames(
        &mut self,
        octx: &mut format::context::Output,
        ost_time_base: Rational,
    ) -> Result<(), JsError> {
        let mut f = frame::Video::empty();
        let mut of = frame::Video::empty();
        let decoder_size = (self.decoder.width(), self.decoder.height());
        let encode_size = (self.encoder.width(), self.encoder.height());
        while self.decoder.receive_frame(&mut f).is_ok() {
            self.frame_count += 1;
            let timestamp = f.timestamp();
            let of = if decoder_size != encode_size {
                self.scalar.run(&f, &mut of)?;
                &mut of
            } else {
                &mut f
            };
            self.log_progress(f64::from(
                Rational(timestamp.unwrap_or(0) as i32, 1) * self.input_time_base,
            ));
            of.set_pts(timestamp);
            of.set_kind(picture::Type::None);
            self.send_frame_to_encoder(&of)?;
            self.receive_and_process_encoded_packets(octx, ost_time_base)?;
        }
        Ok(())
    }

    fn send_frame_to_encoder(&mut self, frame: &frame::Video) -> Result<(), JsError> {
        self.encoder.send_frame(frame)?;
        Ok(())
    }

    fn send_eof_to_encoder(&mut self) -> Result<(), JsError> {
        self.encoder.send_eof()?;
        Ok(())
    }

    fn receive_and_process_encoded_packets(
        &mut self,
        octx: &mut format::context::Output,
        ost_time_base: Rational,
    ) -> Result<(), JsError> {
        let mut encoded = Packet::empty();
        while self.encoder.receive_packet(&mut encoded).is_ok() {
            encoded.set_stream(self.ost_index);
            encoded.rescale_ts(self.input_time_base, ost_time_base);
            encoded.write_interleaved(octx)?;
        }
        Ok(())
    }

    fn log_progress(&mut self, timestamp: f64) {
        if !self.logging_enabled
            || (self.frame_count - self.last_log_frame_count < 100
            && self.last_log_time.elapsed().as_secs_f64() < 1.0)
        {
            return;
        }
        eprintln!(
            "time elpased: \t{:8.2}\tframe count: {:8}\ttimestamp: {:8.2}",
            self.starting_time.elapsed().as_secs_f64(),
            self.frame_count,
            timestamp
        );
        self.last_log_frame_count = self.frame_count;
        self.last_log_time = Instant::now();
    }
}

fn parse_opts<'a>(s: String) -> Option<Dictionary<'a>> {
    let mut dict = Dictionary::new();
    for keyval in s.split_terminator(',') {
        let tokens: Vec<&str> = keyval.split('=').collect();
        match tokens[..] {
            [key, val] => dict.set(key, val),
            _ => return None,
        }
    }
    Some(dict)
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoTranscodeOptions {
    pub input_file: String,
    pub output_file: String,
    pub output_height: Option<u32>,
}

pub fn video_transcode<F: FnMut(i32)>(options: &VideoTranscodeOptions, mut progress_callback: F) -> Result<(), JsError> {
    let x264_opts = parse_opts(DEFAULT_X264_OPTS.to_string()).ok_or(JsError::from_str("invalid x264 options string"))?;

    eprintln!("x264 options: {:?}", x264_opts);

    ffmpeg::init()?;
    log::set_level(log::Level::Info);

    let mut ictx = format::input(&options.input_file)?;
    let mut octx = format::output(&options.output_file)?;

    format::context::input::dump(&ictx, 0, Some(&options.input_file));

    let best_video_stream_index = ictx
        .streams()
        .best(media::Type::Video)
        .map(|stream| stream.index());
    let mut stream_mapping: Vec<isize> = vec![0; ictx.nb_streams() as _];
    let mut ist_time_bases = vec![Rational(0, 0); ictx.nb_streams() as _];
    let mut ost_time_bases = vec![Rational(0, 0); ictx.nb_streams() as _];
    let mut transcoders = HashMap::new();
    let mut ost_index = 0;
    for (ist_index, ist) in ictx.streams().enumerate() {
        let ist_medium = ist.parameters().medium();
        if ist_medium != media::Type::Audio
            && ist_medium != media::Type::Video
            && ist_medium != media::Type::Subtitle
        {
            stream_mapping[ist_index] = -1;
            continue;
        }
        stream_mapping[ist_index] = ost_index;
        ist_time_bases[ist_index] = ist.time_base();
        if ist_medium == media::Type::Video {
            // Initialize transcoder for video stream.
            transcoders.insert(
                ist_index,
                Transcoder::new(
                    &ist,
                    &mut octx,
                    ost_index as _,
                    x264_opts.to_owned(),
                    Some(ist_index) == best_video_stream_index,
                    TranscodeOptions {
                        output_height: options.output_height,
                    }
                )
                    ?,
            );
        } else {
            // Set up for stream copy for non-video stream.
            let mut ost = octx.add_stream(encoder::find(codec::Id::None))?;
            ost.set_parameters(ist.parameters());
            // We need to set codec_tag to 0 lest we run into incompatible codec tag
            // issues when muxing into a different container format. Unfortunately
            // there's no high level API to do this (yet).
            unsafe {
                (*ost.parameters().as_mut_ptr()).codec_tag = 0;
            }
        }
        ost_index += 1;
    }

    octx.set_metadata(ictx.metadata().to_owned());
    format::context::output::dump(&octx, 0, Some(&options.output_file));
    octx.write_header()?;

    for (ost_index, _) in octx.streams().enumerate() {
        ost_time_bases[ost_index] = octx.stream(ost_index as _).unwrap().time_base();
    }

    let duration = ictx.duration() as f32 / ffmpeg::ffi::AV_TIME_BASE as f32;
    let mut latest_pts = 0;
    let mut latest_progress = 0;

    for (stream, mut packet) in ictx.packets() {
        let ist_index = stream.index();
        let ost_index = stream_mapping[ist_index];
        if ost_index < 0 {
            continue;
        }
        let ost_time_base = ost_time_bases[ost_index as usize];
        match transcoders.get_mut(&ist_index) {
            Some(transcoder) => {
                transcoder.send_packet_to_decoder(&packet)?;
                transcoder.receive_and_process_decoded_frames(&mut octx, ost_time_base)?;
                // notify progress
                if let Some(p_pts) = packet.pts() {
                    latest_pts = i64::max(latest_pts, p_pts);
                    let tb = stream.time_base();
                    if tb.0 > 0 && tb.1 > 0 {
                        let time = latest_pts as f32 * tb.0 as f32 / tb.1 as f32;
                        let new_progress = (time / duration * 10000.0) as i32;
                        if new_progress != latest_progress {
                            latest_progress = new_progress;
                            progress_callback(new_progress);
                        }
                    }
                }
            }
            None => {
                // Do stream copy on non-video streams.
                packet.rescale_ts(ist_time_bases[ist_index], ost_time_base);
                packet.set_position(-1);
                packet.set_stream(ost_index as _);
                packet.write_interleaved(&mut octx)?;
            }
        }
    }

    // Flush encoders and decoders.
    for (ost_index, transcoder) in transcoders.iter_mut() {
        let ost_time_base = ost_time_bases[*ost_index];
        transcoder.send_eof_to_decoder()?;
        transcoder.receive_and_process_decoded_frames(&mut octx, ost_time_base)?;
        transcoder.send_eof_to_encoder()?;
        transcoder.receive_and_process_encoded_packets(&mut octx, ost_time_base)?;
    }

    octx.write_trailer()?;
    Ok(())
}
