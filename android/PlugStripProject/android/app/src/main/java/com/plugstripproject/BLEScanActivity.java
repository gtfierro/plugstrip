package com.plugstripproject;

import android.app.ListActivity;
import android.os.Bundle;
import android.os.Handler;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;
import android.bluetooth.*;

public class BLEScanActivity extends ListActivity {
    private BluetoothAdapter mBluetoothAdapter;
    private final static int REQUEST_ENABLE_BT = 1;
    private static final long SCAN_PERIOD = 20000; // scan for 20 seconds
    private Handler mHandler;
    private boolean mScanning;
    private BluetoothAdapter.LeScanCallback mLeScanCallback = 
        new BluetoothAdapter.LeScanCallback() {
            @Override
            public void onLeScan(final BluetoothDevice device, int rssi, byte[] scanRecord) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Context context = getApplicationContext();
                        CharSequence text = "Found device";
                        int duration = Toast.LENGTH_SHORT;

                        Toast toast = Toast.makeText(context, text, duration);
                        toast.show();
                    }
                });
            }
        };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // configure bluetooth
        final BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        mBluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (mBluetoothAdapter == null) { // device doesn't support bluetooth
            Context context = getApplicationContext();
            CharSequence text = "Device does not support BLE";
            int duration = Toast.LENGTH_SHORT;

            Toast toast = Toast.makeText(context, text, duration);
            toast.show();
        }

        // check if bluetooth is enabled
        if (mBluetoothAdapter != null && !mBluetoothAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
        }

    }

    public void startScan() {
        scanLeDevice(true);
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        scanLeDevice(false);
        return;
    }

    // scan BLE method
    private void scanLeDevice(final boolean enable) {
        if (enable) {
            Context context = getApplicationContext();
            CharSequence text = "Started scanning";
            int duration = Toast.LENGTH_SHORT;

            Toast toast = Toast.makeText(context, text, duration);
            toast.show();
            // stops scanning after SCAN_PERIOD seconds
            mHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    mScanning = false;
                    mBluetoothAdapter.stopLeScan(mLeScanCallback);
                }
            }, SCAN_PERIOD);

            // start scanning
            mScanning = true;
            mBluetoothAdapter.startLeScan(mLeScanCallback);
        } else {
            mScanning = false;
            mBluetoothAdapter.stopLeScan(mLeScanCallback);
        }
    }


}
