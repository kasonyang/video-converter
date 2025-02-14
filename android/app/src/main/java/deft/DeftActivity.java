package deft;

import android.app.NativeActivity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.graphics.PixelFormat;
import android.graphics.Point;
import android.graphics.Rect;
import android.util.Log;
import android.view.Display;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;
import android.view.WindowManager;
import android.view.WindowMetrics;

import androidx.annotation.NonNull;

import java.util.List;


public class DeftActivity extends NativeActivity {

    private static native void send(long windowId, String input);
    private static native void sendKey0(long windowId, String key, boolean pressed);
    private static native void setInset0(long windowId, int insetType, float top, float right, float bottom, float left);

    private InputView inputView;

    private long frameId;

    private final static String TAG = DeftActivity.class.getName();

    private void loadNativeLib() {
        String libname = "main";
        try {
            ActivityInfo ai = getPackageManager().getActivityInfo(
                    getIntent().getComponent(), PackageManager.GET_META_DATA);
            if (ai.metaData != null) {
                String ln = ai.metaData.getString(META_DATA_LIB_NAME);
                if (ln != null) libname = ln;
            }
        } catch (PackageManager.NameNotFoundException e) {
            throw new RuntimeException("Error getting activity info", e);
        }
        System.loadLibrary(libname);
    }

//    void initInput_() {
//        this.inputView = new InputView(this.getApplicationContext());
//        this.setContentView(this.inputView);
//        this.listenKeyboard(this.getWindow().getDecorView());
//    }

    // Call by deft
    public void bindDeftWindow(long windowId) {
        this.loadNativeLib();
        this.frameId = windowId;
        this.resetInsets();
        runOnUiThread(() -> {
            this.initInput();
            this.inputView.bindWindow(frameId);
        });
    }

    void resetInsets() {
        WindowManager windowMgr = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        WindowMetrics metrics = windowMgr.getCurrentWindowMetrics();
        WindowInsets insets = metrics.getWindowInsets();
        setStatusInsets(insets);
        setImeInsets(insets);
        //TODO setNavigationBarInsets
    }

    void setStatusInsets(WindowInsets windowInsets) {
        Insets insets = windowInsets.getInsets(WindowInsets.Type.statusBars());
        DeftActivity.setInset0(
                this.frameId,
                WindowInsets.Type.statusBars(),
                0,
                insets.right,
                insets.top,
                0
        );
    }

    void setImeInsets(WindowInsets windowInsets) {
        Insets insets = windowInsets.getInsets(WindowInsets.Type.ime());
        DeftActivity.setInset0(
                this.frameId,
                WindowInsets.Type.ime(),
                0,
                insets.right,
                insets.bottom,
                0
        );
    }

    void initInput() {
        WindowManager windowMgr = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        WindowManager.LayoutParams layoutParams = new WindowManager.LayoutParams();
        layoutParams.type = WindowManager.LayoutParams.TYPE_APPLICATION;
        layoutParams.format = PixelFormat.TRANSLUCENT;
        layoutParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
        Display display = windowMgr.getDefaultDisplay();
        Point p = new Point();
        display.getRealSize(p);
        layoutParams.width = p.x;
        layoutParams.height = p.y;
        View floatView = this.inputView = new InputView(this);
        windowMgr.addView(floatView, layoutParams);
        this.listenKeyboard(floatView);
    }


    private void listenKeyboard(View rootView) {
        Rect originalRect = new Rect();
        rootView.getWindowVisibleDisplayFrame(originalRect);
        rootView.setWindowInsetsAnimationCallback(new WindowInsetsAnimation.Callback(WindowInsetsAnimation.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {

            @NonNull
            @Override
            public WindowInsets onProgress(@NonNull WindowInsets insets, @NonNull List<WindowInsetsAnimation> runningAnimations) {
                DeftActivity.this.setImeInsets(insets);
                return insets;
            }

            @Override
            public void onEnd(@NonNull WindowInsetsAnimation animation) {
                super.onEnd(animation);
                DeftActivity.this.resetInsets();
            }

        });
    }

    // Called by deft
    public void showInput(long frameId, boolean show) {
        this.frameId = frameId;
        runOnUiThread(() -> {
            this.inputView.switchSoftInput(frameId, show);
        });
    }

    // Called by deft
    public void setClipboardText(String content) {
        ClipboardManager manager = this.getSystemService(ClipboardManager.class);
        if (manager == null) {
            return;
        }
        manager.setPrimaryClip(ClipData.newPlainText("deft", content));
    }

    public static void sendText(long windowId, String input) {
        send(windowId, input);
    }

    public static void sendKey(long windowId, int keyCode, boolean pressed) {
        String keyName = keyCodeToName(keyCode);
        if (keyName != null) {
            sendKey0(windowId, keyName, pressed);
        }
    }

    private static String keyCodeToName(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DEL:
                return "Backspace";
            case KeyEvent.KEYCODE_BACK:
                return "GoBack";
            default:
                return null;
        }
    }
}
