package com.plugstripproject;

import android.app.Activity;
import android.widget.Toast;
import android.os.Bundle;
import android.content.Context;
import android.content.Intent;

import com.facebook.react.bridge.ReactContextBaseJavaModule;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class BLEScanModule extends ReactContextBaseJavaModule {
    Activity mActivity;

    public BLEScanModule(ReactApplicationContext reactContext, Activity activity) {
        super(reactContext);
        mActivity = activity;
    }

    public String getName(){
        return "BLE";
    }

    @ReactMethod
    public void scan() {
        BLEScanActivity(mActivity).startScan();
    }
}
