use std::thread;
use deft::{js_func, JsValue};
use deft::event_loop::{create_event_loop_fn_mut};
use deft::js::{JsError, JsPo};
use crate::ffmpeg_util::{video_transcode, VideoTranscodeOptions};

struct Progress {
    total_duration: f64,
    current_duration: f64,
}

#[js_func]
pub fn ffmpeg_convert(options: JsPo::<VideoTranscodeOptions>, callback: JsValue) -> Result<(), JsError> {
    if options.input_file == options.output_file {
        return Err(JsError::from_str("Same input and output"));
    }

    let mut progress_cb = {
        let callback = callback.clone();
        create_event_loop_fn_mut(move |progress: i32| {
            let status = JsValue::String("progress".to_string());
            let param = JsValue::Int(progress);
            let _ = callback.call_as_function(vec![status, param]);
        })
    };
    let mut end_cb = create_event_loop_fn_mut(move |error: Option<JsError>| {
        if let Some(e) = error {
            let status = JsValue::String("error".to_string());
            let param = JsValue::String(e.to_string());
            let _ = callback.call_as_function(vec![status, param]);
        } else {
            let status = JsValue::String("end".to_string());
            let _ = callback.call_as_function(vec![status]);
        }
    });
    thread::Builder::new()
        .name("VideoConvert".to_string())
        .spawn(move || {
        let r = video_transcode(&options, |progress: i32| {
            progress_cb.call(progress);
        });
        match r {
            Ok(r) => end_cb.call(None),
            Err(e) => end_cb.call(Some(e)),
        };
    })?;
    Ok(())
}

