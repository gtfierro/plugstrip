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
import java.util.List;
import java.util.UUID;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

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
    private BluetoothGatt mBluetoothGattMAC;
    private final static int REQUEST_ENABLE_BT = 1;
    private static final long SCAN_PERIOD = 5000; // scan for 5 seconds
    private Handler mHandler;
    private boolean mScanning;
    private final HashMap<String,BluetoothDevice>  myDevices = new HashMap();
    private BluetoothGatt mGatt;
    private BluetoothGattCharacteristic plug1;
    private BluetoothGattCharacteristic plug2;
    private BluetoothGattCharacteristic plug3;
    private BluetoothGattCharacteristic plug4;
    private BluetoothGattCharacteristic plugdefault;
    private BluetoothGattCharacteristic nodemac;

    private int mConnectionState = STATE_DISCONNECTED;

    private static final int STATE_DISCONNECTED = 0;
    private static final int STATE_CONNECTING = 1;
    private static final int STATE_CONNECTED = 2;

    public final static UUID PLUG_STRIP_SERVICE_UUID = UUID.fromString("0000b00c-0000-1000-8000-00805f9b34fb");
    public final static UUID PLUG1 = UUID.fromString("0000b001-0000-1000-8000-00805f9b34fb");
    public final static UUID PLUG2 = UUID.fromString("0000b002-0000-1000-8000-00805f9b34fb");
    public final static UUID PLUG3 = UUID.fromString("0000b003-0000-1000-8000-00805f9b34fb");
    public final static UUID PLUG4 = UUID.fromString("0000b004-0000-1000-8000-00805f9b34fb");
    public final static UUID PLUGDEFAULT = UUID.fromString("0000b00d-0000-1000-8000-00805f9b34fb");
    public final static UUID NODEMAC = UUID.fromString("0000b00e-0000-1000-8000-00805f9b34fb");
    private final static UUID NAMESPACE = UUID.fromString("9e7440b8-92fc-11e5-8bb3-0cc47a0f7eea");

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
            doMessage("Device does not support BLE!");
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
                    if (mScanning) {
                        scanResults.pushMap(item);
                    }

                    // add device to our internal map too
                    myDevices.put(device.toString(), device);
                }
            };

        if (enable) {
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


    private void getGATTView(final String macaddr, final Callback callback) {


        BluetoothGattCallback mGattCallback = new BluetoothGattCallback() {
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
                mGatt = gatt;
                //doMessage("found service"+gatt+" looking for "+PLUG_STRIP_SERVICE_UUID);
                BluetoothGattService plugstrip = gatt.getService(PLUG_STRIP_SERVICE_UUID);
                //doMessage("found plugstrip service"+plugstrip);
                plugdefault = plugstrip.getCharacteristic(PLUGDEFAULT);
                mBluetoothGatt.readCharacteristic(plugdefault);

            }

            @Override
            public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic plug, int status) {
                // report back what we found
                WritableMap found = Arguments.createMap();

                if (status != BluetoothGatt.GATT_SUCCESS) {
                    doMessage("Error reading characteristic");
                }

                int state = 0;
                if (plug != null && plug.getValue()[0] != (byte)48) { // byte value of string "0"
                    state = 1;
                }
                WritableMap plugdefaultstate = Arguments.createMap();
                plugdefaultstate.putString("uuid", (plug == null) ? "" : PLUGDEFAULT.toString());
                plugdefaultstate.putInt("state", state);
                found.putMap("1", plugdefaultstate);
                
                BluetoothDevice dev = gatt.getDevice();
                found.putString("nodemac", UUID.nameUUIDFromBytes(dev.getAddress().getBytes()).toString());
                callback.invoke(found);
            }
            @Override
            public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic plug, int status) {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    mBluetoothGatt.writeCharacteristic(plugdefault);
                }
            }
          };



        BluetoothDevice dev = myDevices.get(macaddr);
        if (dev == null) {
            doMessage("device was null for macaddr "+macaddr);
            return;
        }

        mBluetoothGatt = dev.connectGatt(getReactApplicationContext(), false, mGattCallback);
        
    }

    private void readNodeMAC(final String macaddr, final Callback callback) {
        BluetoothGattCallback mGattCallback = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    mConnectionState = STATE_CONNECTED;
                    mBluetoothGattMAC.discoverServices();
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    mConnectionState = STATE_DISCONNECTED;
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                mGatt = gatt;
                BluetoothGattService plugstrip = gatt.getService(PLUG_STRIP_SERVICE_UUID);
                nodemac = plugstrip.getCharacteristic(NODEMAC);
                mBluetoothGattMAC.readCharacteristic(nodemac);
            }
            @Override
            public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic device, int status) {
                // report back what we found
                WritableMap found = Arguments.createMap();

                if (status != BluetoothGatt.GATT_SUCCESS) {
                    doMessage("Error reading characteristic");
                }
                BluetoothDevice dev = gatt.getDevice();

                //http://stackoverflow.com/questions/9504519/what-namespace-does-the-jdk-use-to-generate-a-uuid-with-nameuuidfrombytes
                long msb = NAMESPACE.getMostSignificantBits();
                long lsb = NAMESPACE.getLeastSignificantBits();
                byte[] namespacebuffer = new byte[16];
                for (int i=0; i<8; i++) {
                    namespacebuffer[i] = (byte) (msb >>> 8*(7-i));
                    namespacebuffer[8+i] = (byte) (lsb >>> 8*(7-(8+i)));
                }
                ByteArrayOutputStream os = new ByteArrayOutputStream();
                try {
                    os.write(namespacebuffer);
                    os.write(device.getStringValue(0).getBytes());
                } catch (IOException e) {
                    callback.invoke(found);
                }

                found.putString("nodemac", UUID.nameUUIDFromBytes(os.toByteArray()).toString());


                callback.invoke(found);
                mBluetoothGattMAC.close();
            }
        };

        BluetoothDevice dev = myDevices.get(macaddr);
        if (dev == null) {
            doMessage("device was null for macaddr "+macaddr);
            return;
        }

        mBluetoothGattMAC = dev.connectGatt(getReactApplicationContext(), false, mGattCallback);
    }

    public String getName(){
        return "BLE";
    }

    @ReactMethod
    public void scan(final Callback callback) {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                doMessage("starting scan");
                scanLeDevice(true, callback);
            }
        }.execute();
    }

    @ReactMethod
    public void connect(final String macaddr, final Callback callback) {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                doMessage("connect to "+macaddr);
                getGATTView(macaddr, callback);
            }
        }.execute();
    }

    @ReactMethod
    public void getNodeMAC(final String macaddr, final Callback callback) {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                readNodeMAC(macaddr, callback);
            }
        }.execute();
    }

    @ReactMethod
    public void setState(final int state, final String characteristic) {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                if (state == 1) {
                    plugdefault.setValue(new byte[]{1});
                } else {
                    plugdefault.setValue(new byte[]{0});
                }
                mBluetoothGatt.writeCharacteristic(plugdefault);
            }
        }.execute();
    }

    @ReactMethod
    public void disconnect() {
        new GuardedAsyncTask<Void, Void>(getReactApplicationContext()) {
            @Override
            protected void doInBackgroundGuarded(Void ...params) {
                if (mBluetoothGatt != null) {
                    mBluetoothGatt.close();
                }
            }
        }.execute();
    }
}
