/* -*- Mode: Java; c-basic-offset: 4; tab-width: 20; indent-tabs-mode: nil; -*-
 * vim: ts=4 sw=4 expandtab:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview;

import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;

import androidx.annotation.AnyThread;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.mozilla.gecko.EventDispatcher;
import org.mozilla.gecko.GeckoAppShell;
import org.mozilla.gecko.util.BundleEventListener;
import org.mozilla.gecko.util.EventCallback;
import org.mozilla.gecko.util.GeckoBundle;

import org.mozilla.geckoview.androidlegacysettings.TorLegacyAndroidSettings;

public class TorIntegrationAndroid implements BundleEventListener {
    private static final String TAG = "TorIntegrationAndroid";

    // Events we listen to
    private static final String EVENT_TOR_START = "GeckoView:Tor:StartTor";
    private static final String EVENT_TOR_STOP = "GeckoView:Tor:StopTor";
    private static final String EVENT_MEEK_START = "GeckoView:Tor:StartMeek";
    private static final String EVENT_MEEK_STOP = "GeckoView:Tor:StopMeek";
    private static final String EVENT_CONNECT_STATE_CHANGED = "GeckoView:Tor:ConnectStateChanged";
    private static final String EVENT_CONNECT_ERROR = "GeckoView:Tor:ConnectError";
    private static final String EVENT_BOOTSTRAP_PROGRESS = "GeckoView:Tor:BootstrapProgress";
    private static final String EVENT_BOOTSTRAP_COMPLETE = "GeckoView:Tor:BootstrapComplete";
    private static final String EVENT_TOR_LOGS = "GeckoView:Tor:Logs";
    private static final String EVENT_SETTINGS_READY = "GeckoView:Tor:SettingsReady";
    private static final String EVENT_SETTINGS_CHANGED = "GeckoView:Tor:SettingsChanged";

    // Events we emit
    private static final String EVENT_SETTINGS_GET = "GeckoView:Tor:SettingsGet";
    private static final String EVENT_SETTINGS_SET = "GeckoView:Tor:SettingsSet";
    private static final String EVENT_SETTINGS_APPLY = "GeckoView:Tor:SettingsApply";
    private static final String EVENT_SETTINGS_SAVE = "GeckoView:Tor:SettingsSave";
    private static final String EVENT_BOOTSTRAP_BEGIN = "GeckoView:Tor:BootstrapBegin";
    private static final String EVENT_BOOTSTRAP_BEGIN_AUTO = "GeckoView:Tor:BootstrapBeginAuto";
    private static final String EVENT_BOOTSTRAP_CANCEL = "GeckoView:Tor:BootstrapCancel";
    private static final String EVENT_BOOTSTRAP_GET_STATE = "GeckoView:Tor:BootstrapGetState";

    private static final String CONTROL_PORT_FILE = "/control-ipc";
    private static final String SOCKS_FILE = "/socks-ipc";
    private static final String COOKIE_AUTH_FILE = "/auth-file";

    private final String mLibraryDir;
    private final String mCacheDir;
    private final String mIpcDirectory;
    private final File mDataDir;

    private TorProcess mTorProcess = null;
    /**
     * The first time we run a Tor process in this session, we copy some configuration files to be
     * sure we always have the latest version, but if we re-launch a tor process we do not need to
     * copy them again.
     */
    private boolean mCopiedConfigFiles = false;
    /**
     * Allow multiple proxies to be started, even though it might not actually happen.
     * The key should be positive (also 0 is not allowed).
     */
    private final HashMap<Integer, MeekTransport> mMeeks = new HashMap<>();
    private int mMeekCounter;

    /**
     * mSettings is a Java-side copy of the authoritative settings in the JS code.
     * It's useful to maintain as the UI may be fetching these options often and we don't watch each
     * fetch to be a passthrough to JS with marshalling/unmarshalling each time.
     */
    private TorSettings mSettings = null;

    /* package */ TorIntegrationAndroid(Context context) {
        mLibraryDir = context.getApplicationInfo().nativeLibraryDir;
        mCacheDir = context.getCacheDir().getAbsolutePath();
        mIpcDirectory = mCacheDir + "/tor-private";
        mDataDir = new File(context.getFilesDir(), "tor");
        registerListener();
    }

    /* package */ synchronized void shutdown() {
        // FIXME: It seems this never gets called
        if (mTorProcess != null) {
            mTorProcess.shutdown();
            mTorProcess = null;
        }
    }

    private void registerListener() {
        EventDispatcher.getInstance()
                .registerUiThreadListener(
                        this,
                        EVENT_TOR_START,
                        EVENT_MEEK_START,
                        EVENT_MEEK_STOP,
                        EVENT_SETTINGS_READY,
                        EVENT_SETTINGS_CHANGED,
                        EVENT_CONNECT_STATE_CHANGED,
                        EVENT_CONNECT_ERROR,
                        EVENT_BOOTSTRAP_PROGRESS,
                        EVENT_BOOTSTRAP_COMPLETE,
                        EVENT_TOR_LOGS);
    }

    @Override // BundleEventListener
    public synchronized void handleMessage(
            final String event, final GeckoBundle message, final EventCallback callback) {
        if (EVENT_TOR_START.equals(event)) {
            startDaemon(message, callback);
        } else if (EVENT_TOR_STOP.equals(event)) {
            stopDaemon(message, callback);
        } else if (EVENT_MEEK_START.equals(event)) {
            startMeek(message, callback);
        } else if (EVENT_MEEK_STOP.equals(event)) {
            stopMeek(message, callback);
        } else if (EVENT_SETTINGS_READY.equals(event)) {
            try {
                new SettingsLoader().execute(message);
            } catch(Exception e) {
                Log.e(TAG, "SettingsLoader error: "+ e.toString());
            }
        } else if (EVENT_SETTINGS_CHANGED.equals(event)) {
            GeckoBundle newSettings = message.getBundle("settings");
            if (newSettings != null) {
                // TODO: Should we notify listeners?
                mSettings = new TorSettings(newSettings);
            } else {
                Log.w(TAG, "Ignoring a settings changed event that did not have the new settings.");
            }
        } else if (EVENT_CONNECT_STATE_CHANGED.equals(event)) {
            String state = message.getString("state");
            for (BootstrapStateChangeListener listener: mBootstrapStateListeners) {
                listener.onBootstrapStateChange(state);
            }
        } else if (EVENT_CONNECT_ERROR.equals(event)) {
            String code = message.getString("code");
            String msg = message.getString("message");
            String phase = message.getString("phase");
            String reason = message.getString("reason");
            for (BootstrapStateChangeListener listener: mBootstrapStateListeners) {
                listener.onBootstrapError(code, msg, phase, reason);
            }
        } else if (EVENT_BOOTSTRAP_PROGRESS.equals(event)) {
            double progress = message.getDouble("progress");
            boolean hasWarnings = message.getBoolean("hasWarnings");
            for (BootstrapStateChangeListener listener: mBootstrapStateListeners) {
                listener.onBootstrapProgress(progress, hasWarnings);
            }
        } else if (EVENT_BOOTSTRAP_COMPLETE.equals(event)) {
            for (BootstrapStateChangeListener listener: mBootstrapStateListeners) {
                listener.onBootstrapComplete();
            }
        } else if (EVENT_TOR_LOGS.equals(event)) {
            String msg = message.getString("message");
            String type = message.getString("logType");
            for (TorLogListener listener: mLogListeners) {
                    listener.onLog(type, msg);
            }
        }
    }

    private class SettingsLoader extends AsyncTask<GeckoBundle, Void, TorSettings> {
        protected TorSettings doInBackground(GeckoBundle... messages) {
            GeckoBundle message = messages[0];
            TorSettings settings;
            if (TorLegacyAndroidSettings.unmigrated()) {
                settings = TorLegacyAndroidSettings.loadTorSettings();
            } else {
                GeckoBundle bundle = message.getBundle("settings");
                settings = new TorSettings(bundle);
            }
            return settings;
        }

        @Override
        protected void onPostExecute(TorSettings torSettings) {
            mSettings = torSettings;
            if (TorLegacyAndroidSettings.unmigrated()) {
                setSettings(mSettings, true, true);
                TorLegacyAndroidSettings.setMigrated();
            }
        }
    }

    private synchronized void startDaemon(final GeckoBundle message, final EventCallback callback) {
        // Let JS generate this to possibly reduce the chance of race conditions.
        String handle = message.getString("handle", "");
        if (handle.isEmpty()) {
            Log.e(TAG, "Requested to start a tor process without a handle.");
            callback.sendError("Expected a handle for the new process.");
            return;
        }
        Log.d(TAG, "Starting the a tor process with handle " + handle);

        TorProcess previousProcess = mTorProcess;
        if (previousProcess != null) {
            Log.w(TAG, "We still have a running process: " + previousProcess.getHandle());
        }
        mTorProcess = new TorProcess(handle);

        GeckoBundle bundle = new GeckoBundle(3);
        bundle.putString("controlPortPath", mIpcDirectory + CONTROL_PORT_FILE);
        bundle.putString("socksPath", mIpcDirectory + SOCKS_FILE);
        bundle.putString("cookieFilePath", mIpcDirectory + COOKIE_AUTH_FILE);
        callback.sendSuccess(bundle);
    }

    private synchronized void stopDaemon(final GeckoBundle message, final EventCallback callback) {
        if (mTorProcess == null) {
            if (callback != null) {
                callback.sendSuccess(null);
            }
            return;
        }
        String handle = message.getString("handle", "");
        if (!mTorProcess.getHandle().equals(handle)) {
            GeckoBundle bundle = new GeckoBundle(1);
            bundle.putString("error", "The requested process has not been found. It might have already been stopped.");
            callback.sendError(bundle);
            return;
        }
        mTorProcess.shutdown();
        mTorProcess = null;
        callback.sendSuccess(null);
    }

    class TorProcess extends Thread {
        private static final String EVENT_TOR_STARTED = "GeckoView:Tor:TorStarted";
        private static final String EVENT_TOR_START_FAILED = "GeckoView:Tor:TorStartFailed";
        private static final String EVENT_TOR_EXITED = "GeckoView:Tor:TorExited";
        private final String mHandle;
        private Process mProcess = null;

        TorProcess(String handle) {
            mHandle = handle;
            setName("tor-process-" + handle);
            start();
        }

        @Override
        public void run() {
            cleanIpcDirectory();

            final String ipcDir = TorIntegrationAndroid.this.mIpcDirectory;
            final ArrayList<String> args = new ArrayList<>();
            args.add(mLibraryDir + "/libTor.so");
            args.add("DisableNetwork");
            args.add("1");
            args.add("+__ControlPort");
            args.add("unix:" + ipcDir + CONTROL_PORT_FILE);
            args.add("+__SocksPort");
            args.add("unix:" + ipcDir + SOCKS_FILE + " IPv6Traffic PreferIPv6 KeepAliveIsolateSOCKSAuth");
            args.add("CookieAuthentication");
            args.add("1");
            args.add("CookieAuthFile");
            args.add(ipcDir + COOKIE_AUTH_FILE);
            args.add("DataDirectory");
            args.add(mDataDir.getAbsolutePath());
            boolean copied = true;
            try {
                copyAndUseConfigFile("--defaults-torrc", "torrc-defaults", args);
            } catch (IOException e) {
                Log.w(TAG, "torrc-default cannot be created, pluggable transports will not be available", e);
                copied = false;
            }
            // tor-browser#42607: For now we do not ship geoip databases, as we
            // do not have the circuit display functionality and they allow us
            // to save some space in the final APK.
            /*try {
                copyAndUseConfigFile("GeoIPFile", "geoip", args);
                copyAndUseConfigFile("GeoIPv6File", "geoip6", args);
            } catch (IOException e) {
                Log.w(TAG, "GeoIP files cannot be created, this feature will not be available.", e);
                copied = false;
            }*/
            mCopiedConfigFiles = copied;

            Log.d(TAG, "Starting tor with the follwing args: " + args.toString());
            final ProcessBuilder builder = new ProcessBuilder(args);
            builder.directory(new File(mLibraryDir));
            try {
                mProcess = builder.start();
            } catch (IOException e) {
                Log.e(TAG, "Cannot start tor " + mHandle, e);
                final GeckoBundle data = new GeckoBundle(2);
                data.putString("handle", mHandle);
                data.putString("error", e.getMessage());
                EventDispatcher.getInstance().dispatch(EVENT_TOR_START_FAILED, data);
                return;
            }
            Log.i(TAG, "Tor process " + mHandle + " started.");
            {
                final GeckoBundle data = new GeckoBundle(1);
                data.putString("handle", mHandle);
                EventDispatcher.getInstance().dispatch(EVENT_TOR_STARTED, data);
            }
            try {
                BufferedReader reader = new BufferedReader(new InputStreamReader(mProcess.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    Log.i(TAG, "[tor-" + mHandle + "] " + line);
                }
            } catch (IOException e) {
                Log.e(TAG, "Failed to read stdout of the tor process " + mHandle, e);
            }
            Log.d(TAG, "Exiting the stdout loop for process " + mHandle);
            final GeckoBundle data = new GeckoBundle(2);
            data.putString("handle", mHandle);
            try {
                data.putInt("status", mProcess.waitFor());
            } catch (InterruptedException e) {
                Log.e(TAG, "Failed to wait for the tor process " + mHandle, e);
                data.putInt("status", 0xdeadbeef);
            }
            // FIXME: We usually don't reach this when the application is killed!
            // So, we don't do our cleanup.
            Log.i(TAG, "Tor process " + mHandle + " has exited.");
            EventDispatcher.getInstance().dispatch(EVENT_TOR_EXITED, data);
        }

        private void cleanIpcDirectory() {
            File directory = new File(TorIntegrationAndroid.this.mIpcDirectory);
            if (!directory.isDirectory()) {
                if (!directory.mkdirs()) {
                    Log.e(TAG, "Failed to create the IPC directory.");
                    return;
                }
                try {
                    // First remove the permissions for everybody...
                    directory.setReadable(false, false);
                    directory.setWritable(false, false);
                    directory.setExecutable(false, false);
                    // ... then add them back, but only for the owner.
                    directory.setReadable(true, true);
                    directory.setWritable(true, true);
                    directory.setExecutable(true, true);
                } catch (SecurityException e) {
                    Log.e(TAG, "Could not set the permissions to the IPC directory.", e);
                }
                return;
            }
            // We assume we do not have child directories, only files
            File[] maybeFiles = directory.listFiles();
            if (maybeFiles != null) {
                for (File file : maybeFiles) {
                    if (!file.delete()) {
                        Log.d(TAG, "Could not delete " + file);
                    }
                }
            }
        }

        private void copyAndUseConfigFile(String option, String name, ArrayList<String> args) throws IOException {
            File file = copyConfigFile(name);
            args.add(option);
            args.add(file.getAbsolutePath());
        }

        private File copyConfigFile(String name) throws IOException {
            final File file = new File(mCacheDir, name);
            if (mCopiedConfigFiles && file.exists()) {
                return file;
            }

            final Context context = GeckoAppShell.getApplicationContext();
            final InputStream in = context.getAssets().open("common/" + name);
            // Files.copy is API 26+, so use java.io and a loop for now.
            FileOutputStream out = null;
            try {
                out = new FileOutputStream(file);
            } catch (IOException e) {
                in.close();
                throw e;
            }
            try {
                byte buffer[] = new byte[4096];
                int read;
                while ((read = in.read(buffer)) >= 0) {
                    out.write(buffer, 0, read);
                }
            } finally {
                try {
                    in.close();
                } catch (IOException e) {
                    Log.w(TAG, "Cannot close the input stream for " + name);
                }
                try {
                    out.close();
                } catch (IOException e) {
                    Log.w(TAG, "Cannot close the output stream for " + name);
                }
            }
            return file;
        }

        public void shutdown() {
            if (mProcess != null && mProcess.isAlive()) {
                mProcess.destroy();
            }
            if (isAlive()) {
                try {
                    join();
                } catch (InterruptedException e) {
                    Log.e(TAG, "Cannot join the thread for tor process " + mHandle + ", possibly already terminated", e);
                }
            }
        }

        public String getHandle() {
            return mHandle;
        }
    }

    private synchronized void startMeek(final GeckoBundle message, final EventCallback callback) {
        if (callback == null) {
            Log.e(TAG, "Tried to start Meek without a callback.");
            return;
        }
        mMeekCounter++;
        mMeeks.put(new Integer(mMeekCounter), new MeekTransport(callback, mMeekCounter));
    }

    private synchronized void stopMeek(final GeckoBundle message, final EventCallback callback) {
        final Integer key = message.getInteger("id");
        final MeekTransport meek = mMeeks.remove(key);
        if (meek != null) {
            meek.shutdown();
        }
        if (callback != null) {
            callback.sendSuccess(null);
        }
    }

    private class MeekTransport extends Thread {
        private static final String TRANSPORT = "meek_lite";
        private Process mProcess;
        private final EventCallback mCallback;
        private final int mId;

        MeekTransport(final EventCallback callback, int id) {
            setName("meek-" + id);
            final ProcessBuilder builder = new ProcessBuilder(mLibraryDir + "/libObfs4proxy.so");
            {
                File ptStateDir = new File(mDataDir, "pt_state");
                final Map<String, String> env = builder.environment();
                env.put("TOR_PT_MANAGED_TRANSPORT_VER", "1");
                env.put("TOR_PT_STATE_LOCATION", ptStateDir.getAbsolutePath());
                env.put("TOR_PT_EXIT_ON_STDIN_CLOSE", "1");
                env.put("TOR_PT_CLIENT_TRANSPORTS", TRANSPORT);
            }
            mCallback = callback;
            mId = id;
            try {
                // We expect this process to be short-lived, therefore we do not bother with
                // implementing this as a service.
                mProcess = builder.start();
            } catch (IOException e) {
                Log.e(TAG, "Cannot start the PT", e);
                callback.sendError(e.getMessage());
                return;
            }
            start();
        }

        /**
         * Parse the standard output of the pluggable transport to find the hostname and port it is
         * listening on.
         * <p>
         * See also the specs for the IPC protocol at https://spec.torproject.org/pt-spec/ipc.html.
         */
        @Override
        public void run() {
            final String PROTOCOL_VERSION = "1";
            String hostname = "";
            boolean valid = false;
            int port = 0;
            String error = "Did not see a CMETHOD";
            try {
                InputStreamReader isr = new InputStreamReader(mProcess.getInputStream());
                BufferedReader reader = new BufferedReader(isr);
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    Log.d(TAG, "Meek line: " + line);
                    // Split produces always at least one item
                    String[] tokens = line.split(" ");
                    if ("VERSION".equals(tokens[0]) && (tokens.length != 2 || !PROTOCOL_VERSION.equals(tokens[1]))) {
                        error = "Bad version: " + line;
                        break;
                    }
                    if ("CMETHOD".equals(tokens[0])) {
                        if (tokens.length != 4) {
                            error = "Bad number of tokens in CMETHOD: " + line;
                            break;
                        }
                        if (!tokens[1].equals(TRANSPORT)) {
                            error = "Unexpected transport: " + tokens[1];
                            break;
                        }
                        if (!"socks5".equals(tokens[2])) {
                            error = "Unexpected proxy type: " + tokens[2];
                            break;
                        }
                        String[] addr = tokens[3].split(":");
                        if (addr.length != 2) {
                            error = "Invalid address";
                            break;
                        }
                        hostname = addr[0];
                        try {
                            port = Integer.parseInt(addr[1]);
                        } catch (NumberFormatException e) {
                            error = "Invalid port: " + e.getMessage();
                            break;
                        }
                        if (port < 1 || port > 65535) {
                            error = "Invalid port: out of bounds";
                            break;
                        }
                        valid = true;
                        break;
                    }
                    if (tokens[0].endsWith("-ERROR")) {
                        error = "Seen an error: " + line;
                        break;
                    }
                }
            } catch (Exception e) {
                error = e.getMessage();
            }
            if (valid) {
                Log.d(TAG, "Setup a meek transport " + mId + ": " + hostname + ":" + port);
                final GeckoBundle bundle = new GeckoBundle(3);
                bundle.putInt("id", mId);
                bundle.putString("address", hostname);
                bundle.putInt("port", port);
                mCallback.sendSuccess(bundle);
            } else {
                Log.e(TAG, "Failed to get a usable config from the PT: " + error);
                mCallback.sendError(error);
            }
        }

        void shutdown() {
            if (mProcess != null) {
                mProcess.destroy();
                mProcess = null;
            }
            try {
                join();
            } catch (InterruptedException e) {
                Log.e(TAG, "Could not join the meek thread", e);
            }
        }
    }

    public interface BootstrapStateChangeListener {
        void onBootstrapStateChange(String state);
        void onBootstrapProgress(double progress, boolean hasWarnings);
        void onBootstrapComplete();
        void onBootstrapError(String code, String message, String phase, String reason);
    }

    public interface TorLogListener {
        void onLog(String logType, String message);
    }

    private @NonNull void reloadSettings() {
        EventDispatcher.getInstance().queryBundle(EVENT_SETTINGS_GET).then( new GeckoResult.OnValueListener<GeckoBundle, Void>() {
            public GeckoResult<Void> onValue(final GeckoBundle bundle) {
                mSettings = new TorSettings(bundle);
                return new GeckoResult<Void>();
            }
        });
    }

    public TorSettings getSettings() {
        return mSettings;
    }

    public void setSettings(final TorSettings settings, boolean save, boolean apply) {
        mSettings = settings;

        emitSetSettings(settings, save, apply).then(
            new GeckoResult.OnValueListener<Void, Void>() {
                public GeckoResult<Void> onValue(Void v) {
                    return new GeckoResult<Void>();
                }
            },
            new GeckoResult.OnExceptionListener<Void>() {
                public GeckoResult<Void> onException(final Throwable e) {
                    Log.e(TAG, "Failed to set settings", e);
                    reloadSettings();
                    return new GeckoResult<Void>();
                }
            });
    }

    private @NonNull GeckoResult<Void> emitSetSettings(final TorSettings settings, boolean save, boolean apply) {
        GeckoBundle bundle = new GeckoBundle(3);
        bundle.putBoolean("save", save);
        bundle.putBoolean("apply", apply);
        bundle.putBundle("settings", settings.asGeckoBundle());
        return EventDispatcher.getInstance().queryVoid(EVENT_SETTINGS_SET, bundle);
    }

    public @NonNull GeckoResult<Void> applySettings() {
        return EventDispatcher.getInstance().queryVoid(EVENT_SETTINGS_APPLY);
    }

    public @NonNull GeckoResult<Void> saveSettings() {
        return EventDispatcher.getInstance().queryVoid(EVENT_SETTINGS_SAVE);
    }

    public @NonNull GeckoResult<Void> beginBootstrap() {
        return EventDispatcher.getInstance().queryVoid(EVENT_BOOTSTRAP_BEGIN);
    }

    public @NonNull GeckoResult<Void> beginAutoBootstrap(final String countryCode) {
        final GeckoBundle bundle = new GeckoBundle(1);
        bundle.putString("countryCode", countryCode);
        return EventDispatcher.getInstance().queryVoid(EVENT_BOOTSTRAP_BEGIN_AUTO, bundle);
    }

    public @NonNull GeckoResult<Void> beginAutoBootstrap() {
        return beginAutoBootstrap(null);
    }

    public @NonNull GeckoResult<Void> cancelBootstrap() {
        return EventDispatcher.getInstance().queryVoid(EVENT_BOOTSTRAP_CANCEL);
    }

    public void registerBootstrapStateChangeListener(BootstrapStateChangeListener listener) {
        mBootstrapStateListeners.add(listener);
    }

    public void unregisterBootstrapStateChangeListener(BootstrapStateChangeListener listener) {
        mBootstrapStateListeners.remove(listener);
    }

    private final HashSet<BootstrapStateChangeListener> mBootstrapStateListeners = new HashSet<>();

    public void registerLogListener(TorLogListener listener) {
        mLogListeners.add(listener);
    }

    public void unregisterLogListener(TorLogListener listener) {
        mLogListeners.remove(listener);
    }

    private final HashSet<TorLogListener> mLogListeners = new HashSet<>();
}
