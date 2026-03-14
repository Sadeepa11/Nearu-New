const { withAndroidManifest, withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withBootReceiverManifest = (config) => {
    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;
        const packageName = config.android?.package || "com.Nearu";

        // Add permissions
        if (!androidManifest.manifest.$['uses-permission']) {
            androidManifest.manifest.$['uses-permission'] = [];
        }
        const permissions = androidManifest.manifest['uses-permission'];
        const requiredPermissions = [
            'android.permission.RECEIVE_BOOT_COMPLETED',
            'android.permission.WAKE_LOCK',
            'android.permission.FOREGROUND_SERVICE'
        ];

        requiredPermissions.forEach(p => {
            if (!permissions.find(perm => perm.$['android:name'] === p)) {
                permissions.push({ $: { 'android:name': p } });
            }
        });

        // Add Receiver and Service to application
        const application = androidManifest.manifest.application[0];
        if (!application.receiver) application.receiver = [];
        if (!application.service) application.service = [];

        // BootReceiver
        if (!application.receiver.find(r => r.$['android:name'] === '.BootReceiver')) {
            application.receiver.push({
                $: {
                    'android:name': '.BootReceiver',
                    'android:enabled': 'true',
                    'android:exported': 'true',
                    'android:permission': 'android.permission.RECEIVE_BOOT_COMPLETED'
                },
                'intent-filter': [{
                    action: [
                        { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                        { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
                        { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } }
                    ]
                }]
            });
        }

        // BootUpService
        if (!application.service.find(s => s.$['android:name'] === '.BootUpService')) {
            application.service.push({
                $: {
                    'android:name': '.BootUpService',
                    'android:permission': 'android.permission.BIND_JOB_SERVICE',
                    'android:exported': 'false'
                }
            });
        }

        // RNBackgroundActionsTask Service
        if (!application.service.find(s => s.$['android:name'] === 'com.asterinet.react.bgactions.RNBackgroundActionsTask')) {
            application.service.push({
                $: {
                    'android:name': 'com.asterinet.react.bgactions.RNBackgroundActionsTask'
                }
            });
        }

        return config;
    });
};

const withBootReceiverFiles = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const packageName = config.android?.package || "com.Nearu";
            const packagePath = packageName.replace(/\./g, '/');
            const mainPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java', packagePath);

            // Create BootReceiver.java
            const bootReceiverContent = `
package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction().equals(Intent.ACTION_BOOT_COMPLETED) || 
            intent.getAction().equals("android.intent.action.QUICKBOOT_POWERON") ||
            intent.getAction().equals(Intent.ACTION_MY_PACKAGE_REPLACED)) {
            
            Intent serviceIntent = new Intent(context, BootUpService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}
      `;

            // Create BootUpService.java
            const bootUpServiceContent = `
package ${packageName};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;
import ${packageName}.R; // Ensure R is imported

public class BootUpService extends HeadlessJsTaskService {
    
    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String CHANNEL_ID = "BootUpChannel";
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Boot Up Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            getSystemService(NotificationManager.class).createNotificationChannel(channel);

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("Nearu is starting")
                    .setContentText("Initializing background services...")
                    .setSmallIcon(R.mipmap.ic_launcher) // Adjust if needed
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build();

            startForeground(1001, notification);
        }
    }

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        // Retry logic: timeout after 5s, no retry? maybe retry.
        // We set timeout to a generous 10s.
        return new HeadlessJsTaskConfig(
            "BootUpTask",
            Arguments.createMap(),
            10000, 
            true
        );
    }
}
      `;

            fs.writeFileSync(path.join(mainPath, 'BootReceiver.java'), bootReceiverContent);
            fs.writeFileSync(path.join(mainPath, 'BootUpService.java'), bootUpServiceContent);

            return config;
        },
    ]);
};

module.exports = (config) => {
    return withPlugins(config, [
        withBootReceiverManifest,
        withBootReceiverFiles
    ]);
};
