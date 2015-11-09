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

import java.util.HashMap;

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
    private BluetoothGatt mBluetoothGatt;
    private final static int REQUEST_ENABLE_BT = 1;
    private static final long SCAN_PERIOD = 5000; // scan for 5 seconds
    private Handler mHandler;
    private boolean mScanning;
    private final HashMap<String,BluetoothDevice>  myDevices = new HashMap();

    private int mConnectionState = STATE_DISCONNECTED;

    private static final int STATE_DISCONNECTED = 0;
    private static final int STATE_CONNECTING = 1;
    private static final int STATE_CONNECTED = 2;

    public final static String ACTION_GATT_CONNECTED =
      "com.plugstripproject.bluetooth.le.ACTION_GATT_CONNECTED";
    public final static String ACTION_GATT_DISCONNECTED =
      "com.plugstripproject.bluetooth.le.ACTION_GATT_DISCONNECTED";
    public final static String ACTION_GATT_SERVICES_DISCOVERED =
      "com.plugstripproject.bluetooth.le.ACTION_GATT_SERVICES_DISCOVERED";
    public final static String ACTION_DATA_AVAILABLE =
      "com.plugstripproject.bluetooth.le.ACTION_DATA_AVAILABLE";


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

    private void doMessage(final String message) {
          mActivity.runOnUiThread(new Runnable() {
              public void run() {
                  CharSequence text = message;
                  Toast.makeText(getReactApplicationContext(), text, Toast.LENGTH_SHORT).show();
              }
          });
    }


    // scan BLE method
    private void scanLeDevice(final boolean enable, final Callback callback) {

        final WritableArray scanResults = Arguments.createArray();
        final BluetoothAdapter.LeScanCallback newcallback =
            new BluetoothAdapter.LeScanCallback() {
                // wrap up the bluetooth device so that we can send it back to React
                @Override
                public void onLeScan(final BluetoothDevice device, int rssi, byte[] scanRecord) {
                    WritableMap item = Arguments.createMap();
                    item.putString("name", device.getName());
                    item.putInt("rssi",rssi);
                    Object[] uuids = device.getUuids();
                    if (uuids != null) {
                        WritableArray uuidsArray = Arguments.fromJavaArgs(uuids);
                        item.putArray("uuids", uuidsArray);
                    }
                    item.putString("macaddr", device.toString());
                    scanResults.pushMap(item);

                    // add device to our internal map too
                    myDevices.put(device.toString(), device);
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

    private final BluetoothGattCallback mGattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                mConnectionState = STATE_CONNECTED;
                doMessage("connected!");
                mBluetoothGatt.discoverServices();
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                doMessage("disconnected!");
                mConnectionState = STATE_DISCONNECTED;
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt gatt, int status) {
            // add to list of services?
            doMessage("found service"+gatt);
        }

        @Override
        public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
            // add to list of characteristics
            doMessage("found characteristic"+gatt+characteristic);
        }
      };

    private void getGATTView(final String macaddr, final Callback callback) {
        BluetoothDevice dev = myDevices.get(macaddr);
        if (dev == null) {
            mActivity.runOnUiThread(new Runnable() {
                public void run() {
                    CharSequence text = "device was null for macaddr "+macaddr;
                    Toast.makeText(getReactApplicationContext(), text, Toast.LENGTH_SHORT).show();
                }
            });
            return;
        }

        mBluetoothGatt = dev.connectGatt(getReactApplicationContext(), false, mGattCallback);
        
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

    @ReactMethod
    public void connect(final String macaddr, final Callback callback) {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                mActivity.runOnUiThread(new Runnable() {
                    public void run() {
                        CharSequence text = "connect to "+macaddr;
                        Toast.makeText(getReactApplicationContext(), text, Toast.LENGTH_SHORT).show();
                    }
                });
                getGATTView(macaddr, callback);
            }
        }.execute();
    }
}
