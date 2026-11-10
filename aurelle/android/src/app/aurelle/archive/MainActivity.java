package app.aurelle.archive;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int FILE_REQUEST = 41;
    private static final int INK = Color.parseColor("#080809");

    private WebView web;
    private ValueCallback<Uri[]> upload;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showSplash();
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                openWeb();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (upload != null) {
            upload.onReceiveValue(null);
            upload = null;
        }
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript(
            "(function(){try{return !!(window.aurelleHardwareBack&&window.aurelleHardwareBack())}catch(e){return false}})()",
            new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if (!"true".equals(value)) finish();
                }
            }
        );
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQUEST || upload == null) return;
        upload.onReceiveValue(chosenUris(resultCode, data));
        upload = null;
    }

    private void showSplash() {
        TextView view = new TextView(this);
        view.setText("AURELLE");
        view.setTextColor(Color.parseColor("#E4D5C3"));
        view.setBackgroundColor(INK);
        view.setTextSize(40);
        view.setGravity(Gravity.BOTTOM | Gravity.START);
        view.setPadding(56, 56, 56, 140);
        setContentView(view);
    }

    private void showMessage(String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.parseColor("#F2F0EB"));
        view.setBackgroundColor(INK);
        view.setTextSize(18);
        view.setPadding(48, 96, 48, 48);
        setContentView(view);
    }

    private void openWeb() {
        try {
            web = new WebView(this);
            web.setBackgroundColor(INK);
            WebSettings settings = web.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMediaPlaybackRequiresUserGesture(true);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(false);
            settings.setTextZoom(100);
            web.setInitialScale(100);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            web.setOverScrollMode(View.OVER_SCROLL_NEVER);
            web.setVerticalScrollBarEnabled(false);
            web.setHorizontalScrollBarEnabled(false);
            web.setWebChromeClient(new Chooser());
            setContentView(web);
            try {
                getWindow().setStatusBarColor(INK);
                getWindow().setNavigationBarColor(INK);
            } catch (Throwable ignored) {
                /* system bars are optional */
            }
            web.loadUrl("file:///android_asset/www/index.html");
        } catch (Throwable error) {
            showMessage("Could not open AURELLE. Update Android System WebView in the Play Store and open the app again.");
        }
    }

    private Uri[] chosenUris(int resultCode, Intent data) {
        if (resultCode == RESULT_OK && data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
            int count = data.getClipData().getItemCount();
            Uri[] uris = new Uri[count];
            for (int i = 0; i < count; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
            return uris;
        }
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            return new Uri[] { data.getData() };
        }
        try {
            return WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private final class Chooser extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (upload != null) {
                upload.onReceiveValue(null);
                upload = null;
            }
            upload = callback;
            try {
                Intent intent = params.createIntent();
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                startActivityForResult(intent, FILE_REQUEST);
            } catch (RuntimeException error) {
                upload = null;
                return false;
            }
            return true;
        }
    }
}
