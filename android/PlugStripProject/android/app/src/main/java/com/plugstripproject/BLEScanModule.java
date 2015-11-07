package com.plugstripproject;

import android.app.Activity;
import android.widget.Toast;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;
import android.bluetooth.*;

import com.facebook.react.bridge.ReactContextBaseJavaModule;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.GuardedAsyncTask;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;


public class BLEScanModule extends ReactContextBaseJavaModule {
    Activity mActivity;
    Context reactContext;
    private BluetoothAdapter mBluetoothAdapter;
    private final static int REQUEST_ENABLE_BT = 1;
    private static final long SCAN_PERIOD = 10000; // scan for 10 seconds
    private Handler mHandler;
    private boolean mScanning;


    public BLEScanModule(ReactApplicationContext reactContext, Activity activity) {
        super(reactContext);
        mActivity = activity;
        this.reactContext = reactContext;

        mHandler = new Handler(Looper.getMainLooper());

        // configure bluetooth
        final BluetoothManager bluetoothManager = (BluetoothManager) mActivity.getSystemService(Context.BLUETOOTH_SERVICE);
        mBluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (mBluetoothAdapter == null) { // device doesn't support bluetooth
            mActivity.runOnUiThread(new Runnable() {
                public void run() {
                    CharSequence text = "Device does not support BLE";
                    Toast.makeText(getReactApplicationContext(), text, Toast.LENGTH_SHORT).show();
                }
            });
        }

        // check if bluetooth is enabled
        if (mBluetoothAdapter != null && !mBluetoothAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            mActivity.startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
        }
    }

    // scan BLE method
    private void scanLeDevice(final boolean enable, final Callback callback) {

        final WritableArray scanResults = Arguments.createArray();
        final BluetoothAdapter.LeScanCallback newcallback =
            new BluetoothAdapter.LeScanCallback() {
                @Override
                public void onLeScan(final BluetoothDevice device, int rssi, byte[] scanRecord) {
                    WritableMap item = Arguments.createMap();
                    item.putString("name", device.getName());
                    //WritableArray uuids = Arguments.fromJavaArgs(device.getUuids());
                    //item.putArray("uuids", uuids);
                    item.putString("string", device.toString());
                    scanResults.pushMap(item);
                            // INVOKE CALLBACK ONCE
                            //callback.invoke(device.getName(), device.getUuids(), device.toString());
                }
            };

        if (enable) {
            mActivity.runOnUiThread(new Runnable() {
                public void run() {
                    CharSequence text = "actually Started scanning";
                    Toast.makeText(getReactApplicationContext(), text, Toast.LENGTH_SHORT).show();
                }
            });
            // stops scanning after SCAN_PERIOD seconds
            mHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    mScanning = false;
                    mBluetoothAdapter.stopLeScan(newcallback);
                    callback.invoke(scanResults);
                }
            }, SCAN_PERIOD);

            // start scanning
            mScanning = true;
            mBluetoothAdapter.startLeScan(newcallback);
        } else {
            mScanning = false;
            mBluetoothAdapter.stopLeScan(newcallback);
        }
    }

    public String getName(){
        return "BLE";
    }

    @ReactMethod
    public void scan(final Callback callback) {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                mActivity.runOnUiThread(new Runnable() {
                    public void run() {
                        CharSequence text = "scan task started";
                        Toast.makeText(getReactApplicationContext(), text, Toast.LENGTH_SHORT).show();
                    }
                });

                scanLeDevice(true, callback);
            }
        }.execute();
    }
}
