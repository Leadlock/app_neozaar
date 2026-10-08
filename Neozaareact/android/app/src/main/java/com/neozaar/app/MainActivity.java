package com.neozaar.app;

import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import androidx.annotation.NonNull;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "NeoZaarNetwork";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Optimize WebView for live network status
        try {
            WebSettings settings = this.getBridge().getWebView().getSettings();
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView settings", e);
        }

        // Initial check: If starting offline, jump to error page immediately
        if (!isNetworkAvailable()) {
            Log.d(TAG, "Starting offline - redirecting to local error page");
            // Use a slight delay to ensure Bridge is ready
            new android.os.Handler().postDelayed(() -> 
                getBridge().getWebView().loadUrl("file:///android_asset/public/error.html"), 
            500);
        }
        
        registerNetworkCallback();
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (connectivityManager == null) return false;
        
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) return false;
        
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        return capabilities != null && (
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || 
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void registerNetworkCallback() {
        try {
            ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (connectivityManager == null) return;

            NetworkRequest.Builder builder = new NetworkRequest.Builder();

            connectivityManager.registerNetworkCallback(
                builder.build(),
                new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onLost(@NonNull Network network) {
                        super.onLost(network);
                        Log.d(TAG, "Network connection lost");
                        runOnUiThread(() -> getBridge().getWebView().loadUrl("file:///android_asset/public/error.html"));
                    }

                    @Override
                    public void onAvailable(@NonNull Network network) {
                        super.onAvailable(network);
                        Log.d(TAG, "Network connection restored");
                        runOnUiThread(() -> {
                            String url = getBridge().getWebView().getUrl();
                            if (url != null && (url.contains("error.html") || url.contains("offline.html") || url.contains("maintenance.html"))) {
                                // Redirection is handled by the JS in those files, but we provide a nudge
                                getBridge().getWebView().loadUrl("https://www.neozaar.com/");
                            }
                        });
                    }
                }
            );
        } catch (Exception e) {
            Log.e(TAG, "Error registering network callback", e);
        }
    }
}
