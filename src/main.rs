use deft::app::{App, IApp};
use deft::bootstrap;
use deft::js::js_engine::JsEngine;
use std::env;
use std::path::Path;
use crate::ext_ffmpeg::ffmpeg_convert;

mod ext_ffmpeg;
mod ffmpeg_util;

struct MyApp {}

impl IApp for MyApp {
    fn init_js_engine(&mut self, js_engine: &mut JsEngine) {
        js_engine.enable_localstorage(env::current_exe().unwrap().parent().unwrap().join("localstorage"));
        js_engine
            .eval_module(include_str!("../dev-hack.js"), "dev-hack.js")
            .unwrap();
        js_engine.add_global_func(ffmpeg_convert::new());
    }

    fn create_module_loader(
        &mut self,
    ) -> Box<dyn deft::js::loader::JsModuleLoader + Send + Sync + 'static> {
        include!(concat!(env!("OUT_DIR"), "/js_loader.code"))
    }
}

fn main() {
    let app = App::new(MyApp {});
    bootstrap(app.clone());
}

#[cfg(target_os = "android")]
#[no_mangle]
fn android_main(android_app: deft::winit::platform::android::activity::AndroidApp) {
    let app = App::new(MyApp {});
    deft::android_bootstrap(android_app, app);
}
