package deft;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Rect;
import android.text.InputType;
import android.view.KeyEvent;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.inputmethod.BaseInputConnection;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;

import androidx.appcompat.widget.AppCompatEditText;

public class InputView extends AppCompatEditText {

    private final static String TAG = InputView.class.getName();

    private long frameId;

    private boolean showSoftInput;

    private boolean focused;

    public InputView(Context context) {
        super(context);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        this.sendKeyEvent(event);
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        this.sendKeyEvent(event);
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        outAttrs.inputType = InputType.TYPE_CLASS_TEXT;
        return new BaseInputConnection(this, false) {

            @Override
            public boolean commitText(CharSequence text, int newCursorPosition) {
                DeftActivity.sendText(frameId, text.toString());
                return true;
            }

            @Override
            public boolean sendKeyEvent(KeyEvent event) {
                InputView.this.sendKeyEvent(event);
                return super.sendKeyEvent(event);
            }

            @Override
            public boolean performContextMenuAction(int id) {
                if (id == android.R.id.paste) {
                    this.paste();
                }
                return super.performContextMenuAction(id);
            }

            private void paste() {
                ClipboardManager manager = InputView.this.getContext().getSystemService(ClipboardManager.class);
                if (manager == null) {
                    return;
                }
                ClipData data = manager.getPrimaryClip();
                if (data != null && data.getItemCount() > 0) {
                    String content = data.getItemAt(0).getText().toString();
                    DeftActivity.sendText(frameId, content);
                }
            }
        };
    }

    @Override
    protected void onFocusChanged(boolean focused, int direction, Rect previouslyFocusedRect) {
        this.focused = focused;
        this.syncSoftInput();
        super.onFocusChanged(focused, direction, previouslyFocusedRect);
    }

    public void bindWindow(long frameId) {
        this.frameId = frameId;
    }

    public void switchSoftInput(long frameId, boolean show) {
        this.frameId = frameId;
        this.showSoftInput = show;
        this.syncSoftInput();
//        if (show && !this.focused) {
//            this.requestFocus();
//        } else {
//            this.syncSoftInput();
//        }
    }

    private void sendKeyEvent(KeyEvent event) {
        boolean pressed = event.getAction() == KeyEvent.ACTION_DOWN;
        int keyCode = event.getKeyCode();
        DeftActivity.sendKey(frameId, keyCode, pressed);
    }

    private void syncSoftInput() {
        WindowInsetsController ic = this.getWindowInsetsController();
        int type = WindowInsets.Type.ime();
        if (ic != null) {
            if (this.showSoftInput) {
                ic.show(type);
            } else {
                ic.hide(type);
            }
        }
    }

}
