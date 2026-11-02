package com.family.home;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable WebView debugging for Appium automated testing and remote inspection
        WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Allow background timers, WebSocket/polling & location tracking to keep running when minimized
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }
}
