<template>
  <el-container>
    <el-header class="header">
      <el-row type="flex" class="row-bg" justify="space-between">
        <el-col
          ><el-link target="/" :underline="false">{{
            "Contract Deployer"
          }}</el-link></el-col
        >
        <el-col class="nav-btns">
          <el-button
            v-if="!metaMaskChainIdCorrect && this.metaMaskChainConfig"
            @click="switchChain"
          >
            {{ `Switch to Crab network` }}
          </el-button>
          <el-tag class="connected" v-if="connected">{{
            connectedAccount
          }}</el-tag>
          <el-button v-else @click="connect" class="metamask-btn">
            {{ `Connect to Metamask` }}
          </el-button>
          <div v-if="isApiReady && hasExtentionAccount">
            <div class="signer-section">
              <div class="detail-section">
                <div class="signer">
                  <el-select
                    :value="signer"
                    placeholder=""
                    @change="changeSigner"
                    ref="extensionAccountSelect"
                  >
                    <el-option
                      class="dropdown-item"
                      v-for="item in this.extentionList"
                      :key="item.address"
                      :label="item.address"
                      :value="item.address"
                    >
                      <div class="account-box">
                        {{ item.address }}
                      </div>
                    </el-option>
                  </el-select>
                </div>
              </div>
            </div>
          </div>
          <el-button
            v-else-if="isLoading"
            :loading="isLoading"
            class="button black-btn connect-btn"
            @click="initPolkaApi"
          >
            {{ "Connecting" }}
          </el-button>
          <el-button
            v-else
            class="button black-btn connect-btn"
            @click="initPolkaApi"
          >
            {{ "Connect to Polkadot.js" }}
          </el-button>
        </el-col>
      </el-row>
    </el-header>
    <el-main class="main">
      <el-form class="contract-form" label-position="top" label-width="80px" :model="contractDetail">
        <el-form-item label="Source Code">
          <el-input
            type="textarea"
            :rows="10"
            v-model="contractDetail.code"
          ></el-input>
        </el-form-item>
        <el-form-item label="Compiler Version">
          <el-select
            class="select"
            :value="contractDetail.compiler"
            placeholder=""
            @change="changeCompiler"
            ref="compilerSelect"
          >
            <el-option
              class="dropdown-item"
              v-for="item in this.compilerList"
              :key="item"
              :label="item"
              :value="item"
            >
              <div class="account-box">
                {{ item }}
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="Contract to Deploy" v-if="this.compiled && this.compiled['contracts']">
          <el-select
            class="select"
            :value="contractDetail.contractName"
            placeholder=""
            @change="changeContract"
            ref="compilerSelect"
          >
            <el-option
              class="dropdown-item"
              v-for="(item, key) in this.compiled['contracts']['test.sol']"
              :key="key"
              :label="key"
              :value="key"
            >
              <div class="account-box">
                {{ key }}
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div class="main-btns">
        <el-button @click="compile" :loading="isCompiling">
          {{ `Compile` }}
        </el-button>
        <el-button v-if="compiled.contracts" @click="deploy">
          {{ `Deploy` }}
        </el-button>
        <el-button @click="storeOnCrust">
          {{ `Store on Crust` }}
        </el-button>
      </div>
    </el-main>
  </el-container>
</template>

<script>
import work from "webworkify-webpack";
import Web3 from "web3";
import { create } from "ipfs-http-client";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { stringToHex } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { typesBundleForPolkadot } from "@crustio/type-definitions";
import _ from "lodash";
export default {
  data() {
    return {
      extentionList: [],
      isLoading: false,
      isCompiling: false,
      connected: false,
      connectedAccount: "",
      web3: null,
      api: null,
      isApiReady: false,
      exampleSource:
        "cHJhZ21hIHNvbGlkaXR5ID4wLjQuMTMgPj0wLjQuMjMgPj0wLjQuMjMgPDAuNy4wOwoKaW50ZXJmYWNlIERTQXV0aG9yaXR5IHsKICAgIGZ1bmN0aW9uIGNhbkNhbGwoCiAgICAgICAgYWRkcmVzcyBzcmMsIGFkZHJlc3MgZHN0LCBieXRlczQgc2lnCiAgICApIGV4dGVybmFsIHZpZXcgcmV0dXJucyAoYm9vbCk7Cn0KCmNvbnRyYWN0IERTQXV0aEV2ZW50cyB7CiAgICBldmVudCBMb2dTZXRBdXRob3JpdHkgKGFkZHJlc3MgaW5kZXhlZCBhdXRob3JpdHkpOwogICAgZXZlbnQgTG9nU2V0T3duZXIgICAgIChhZGRyZXNzIGluZGV4ZWQgb3duZXIpOwp9Cgpjb250cmFjdCBEU0F1dGggaXMgRFNBdXRoRXZlbnRzIHsKICAgIERTQXV0aG9yaXR5ICBwdWJsaWMgIGF1dGhvcml0eTsKICAgIGFkZHJlc3MgICAgICBwdWJsaWMgIG93bmVyOwoKICAgIGNvbnN0cnVjdG9yKCkgcHVibGljIHsKICAgICAgICBvd25lciA9IG1zZy5zZW5kZXI7CiAgICAgICAgZW1pdCBMb2dTZXRPd25lcihtc2cuc2VuZGVyKTsKICAgIH0KCiAgICBmdW5jdGlvbiBzZXRPd25lcihhZGRyZXNzIG93bmVyXykKICAgICAgICBwdWJsaWMKICAgICAgICBhdXRoCiAgICB7CiAgICAgICAgb3duZXIgPSBvd25lcl87CiAgICAgICAgZW1pdCBMb2dTZXRPd25lcihvd25lcik7CiAgICB9CgogICAgZnVuY3Rpb24gc2V0QXV0aG9yaXR5KERTQXV0aG9yaXR5IGF1dGhvcml0eV8pCiAgICAgICAgcHVibGljCiAgICAgICAgYXV0aAogICAgewogICAgICAgIGF1dGhvcml0eSA9IGF1dGhvcml0eV87CiAgICAgICAgZW1pdCBMb2dTZXRBdXRob3JpdHkoYWRkcmVzcyhhdXRob3JpdHkpKTsKICAgIH0KCiAgICBtb2RpZmllciBhdXRoIHsKICAgICAgICByZXF1aXJlKGlzQXV0aG9yaXplZChtc2cuc2VuZGVyLCBtc2cuc2lnKSwgImRzLWF1dGgtdW5hdXRob3JpemVkIik7CiAgICAgICAgXzsKICAgIH0KCiAgICBmdW5jdGlvbiBpc0F1dGhvcml6ZWQoYWRkcmVzcyBzcmMsIGJ5dGVzNCBzaWcpIGludGVybmFsIHZpZXcgcmV0dXJucyAoYm9vbCkgewogICAgICAgIGlmIChzcmMgPT0gYWRkcmVzcyh0aGlzKSkgewogICAgICAgICAgICByZXR1cm4gdHJ1ZTsKICAgICAgICB9IGVsc2UgaWYgKHNyYyA9PSBvd25lcikgewogICAgICAgICAgICByZXR1cm4gdHJ1ZTsKICAgICAgICB9IGVsc2UgaWYgKGF1dGhvcml0eSA9PSBEU0F1dGhvcml0eShhZGRyZXNzKDApKSkgewogICAgICAgICAgICByZXR1cm4gZmFsc2U7CiAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgcmV0dXJuIGF1dGhvcml0eS5jYW5DYWxsKHNyYywgYWRkcmVzcyh0aGlzKSwgc2lnKTsKICAgICAgICB9CiAgICB9Cn0KCmNvbnRyYWN0IERTTWF0aCB7CiAgICBmdW5jdGlvbiBhZGQodWludCB4LCB1aW50IHkpIGludGVybmFsIHB1cmUgcmV0dXJucyAodWludCB6KSB7CiAgICAgICAgcmVxdWlyZSgoeiA9IHggKyB5KSA+PSB4LCAiZHMtbWF0aC1hZGQtb3ZlcmZsb3ciKTsKICAgIH0KICAgIGZ1bmN0aW9uIHN1Yih1aW50IHgsIHVpbnQgeSkgaW50ZXJuYWwgcHVyZSByZXR1cm5zICh1aW50IHopIHsKICAgICAgICByZXF1aXJlKCh6ID0geCAtIHkpIDw9IHgsICJkcy1tYXRoLXN1Yi11bmRlcmZsb3ciKTsKICAgIH0KICAgIGZ1bmN0aW9uIG11bCh1aW50IHgsIHVpbnQgeSkgaW50ZXJuYWwgcHVyZSByZXR1cm5zICh1aW50IHopIHsKICAgICAgICByZXF1aXJlKHkgPT0gMCB8fCAoeiA9IHggKiB5KSAvIHkgPT0geCwgImRzLW1hdGgtbXVsLW92ZXJmbG93Iik7CiAgICB9CgogICAgZnVuY3Rpb24gbWluKHVpbnQgeCwgdWludCB5KSBpbnRlcm5hbCBwdXJlIHJldHVybnMgKHVpbnQgeikgewogICAgICAgIHJldHVybiB4IDw9IHkgPyB4IDogeTsKICAgIH0KICAgIGZ1bmN0aW9uIG1heCh1aW50IHgsIHVpbnQgeSkgaW50ZXJuYWwgcHVyZSByZXR1cm5zICh1aW50IHopIHsKICAgICAgICByZXR1cm4geCA+PSB5ID8geCA6IHk7CiAgICB9CiAgICBmdW5jdGlvbiBpbWluKGludCB4LCBpbnQgeSkgaW50ZXJuYWwgcHVyZSByZXR1cm5zIChpbnQgeikgewogICAgICAgIHJldHVybiB4IDw9IHkgPyB4IDogeTsKICAgIH0KICAgIGZ1bmN0aW9uIGltYXgoaW50IHgsIGludCB5KSBpbnRlcm5hbCBwdXJlIHJldHVybnMgKGludCB6KSB7CiAgICAgICAgcmV0dXJuIHggPj0geSA/IHggOiB5OwogICAgfQoKICAgIHVpbnQgY29uc3RhbnQgV0FEID0gMTAgKiogMTg7CiAgICB1aW50IGNvbnN0YW50IFJBWSA9IDEwICoqIDI3OwoKICAgIGZ1bmN0aW9uIHdtdWwodWludCB4LCB1aW50IHkpIGludGVybmFsIHB1cmUgcmV0dXJucyAodWludCB6KSB7CiAgICAgICAgeiA9IGFkZChtdWwoeCwgeSksIFdBRCAvIDIpIC8gV0FEOwogICAgfQogICAgZnVuY3Rpb24gcm11bCh1aW50IHgsIHVpbnQgeSkgaW50ZXJuYWwgcHVyZSByZXR1cm5zICh1aW50IHopIHsKICAgICAgICB6ID0gYWRkKG11bCh4LCB5KSwgUkFZIC8gMikgLyBSQVk7CiAgICB9CiAgICBmdW5jdGlvbiB3ZGl2KHVpbnQgeCwgdWludCB5KSBpbnRlcm5hbCBwdXJlIHJldHVybnMgKHVpbnQgeikgewogICAgICAgIHogPSBhZGQobXVsKHgsIFdBRCksIHkgLyAyKSAvIHk7CiAgICB9CiAgICBmdW5jdGlvbiByZGl2KHVpbnQgeCwgdWludCB5KSBpbnRlcm5hbCBwdXJlIHJldHVybnMgKHVpbnQgeikgewogICAgICAgIHogPSBhZGQobXVsKHgsIFJBWSksIHkgLyAyKSAvIHk7CiAgICB9CiAgICBmdW5jdGlvbiBycG93KHVpbnQgeCwgdWludCBuKSBpbnRlcm5hbCBwdXJlIHJldHVybnMgKHVpbnQgeikgewogICAgICAgIHogPSBuICUgMiAhPSAwID8geCA6IFJBWTsKCiAgICAgICAgZm9yIChuIC89IDI7IG4gIT0gMDsgbiAvPSAyKSB7CiAgICAgICAgICAgIHggPSBybXVsKHgsIHgpOwoKICAgICAgICAgICAgaWYgKG4gJSAyICE9IDApIHsKICAgICAgICAgICAgICAgIHogPSBybXVsKHosIHgpOwogICAgICAgICAgICB9CiAgICAgICAgfQogICAgfQp9Cgpjb250cmFjdCBEU1Rva2VuIGlzIERTTWF0aCwgRFNBdXRoIHsKICAgIGJvb2wgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVibGljICBzdG9wcGVkOwogICAgdWludDI1NiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaWMgIHRvdGFsU3VwcGx5OwogICAgbWFwcGluZyAoYWRkcmVzcyA9PiB1aW50MjU2KSAgICAgICAgICAgICAgICAgICAgICBwdWJsaWMgIGJhbGFuY2VPZjsKICAgIG1hcHBpbmcgKGFkZHJlc3MgPT4gbWFwcGluZyAoYWRkcmVzcyA9PiB1aW50MjU2KSkgcHVibGljICBhbGxvd2FuY2U7CiAgICBzdHJpbmcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1YmxpYyAgc3ltYm9sOwogICAgdWludDggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaWMgIGRlY2ltYWxzID0gMTg7IAogICAgc3RyaW5nICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwdWJsaWMgIG5hbWUgPSAiIjsKCgogICAgY29uc3RydWN0b3IoKSBwdWJsaWMgewogICAgICAgIHN5bWJvbCA9ICJ0ZXN0VG9rZW4iOwogICAgfQoKICAgIGV2ZW50IEFwcHJvdmFsKGFkZHJlc3MgaW5kZXhlZCBzcmMsIGFkZHJlc3MgaW5kZXhlZCBndXksIHVpbnQgd2FkKTsKICAgIGV2ZW50IFRyYW5zZmVyKGFkZHJlc3MgaW5kZXhlZCBzcmMsIGFkZHJlc3MgaW5kZXhlZCBkc3QsIHVpbnQgd2FkKTsKICAgIGV2ZW50IE1pbnQoYWRkcmVzcyBpbmRleGVkIGd1eSwgdWludCB3YWQpOwogICAgZXZlbnQgQnVybihhZGRyZXNzIGluZGV4ZWQgZ3V5LCB1aW50IHdhZCk7CiAgICBldmVudCBTdG9wKCk7CiAgICBldmVudCBTdGFydCgpOwoKICAgIG1vZGlmaWVyIHN0b3BwYWJsZSB7CiAgICAgICAgcmVxdWlyZSghc3RvcHBlZCwgImRzLXN0b3AtaXMtc3RvcHBlZCIpOwogICAgICAgIF87CiAgICB9CgogICAgZnVuY3Rpb24gYXBwcm92ZShhZGRyZXNzIGd1eSkgZXh0ZXJuYWwgcmV0dXJucyAoYm9vbCkgewogICAgICAgIHJldHVybiBhcHByb3ZlKGd1eSwgdWludCgtMSkpOwogICAgfQoKICAgIGZ1bmN0aW9uIGFwcHJvdmUoYWRkcmVzcyBndXksIHVpbnQgd2FkKSBwdWJsaWMgc3RvcHBhYmxlIHJldHVybnMgKGJvb2wpIHsKICAgICAgICBhbGxvd2FuY2VbbXNnLnNlbmRlcl1bZ3V5XSA9IHdhZDsKCiAgICAgICAgZW1pdCBBcHByb3ZhbChtc2cuc2VuZGVyLCBndXksIHdhZCk7CgogICAgICAgIHJldHVybiB0cnVlOwogICAgfQoKICAgIGZ1bmN0aW9uIHRyYW5zZmVyKGFkZHJlc3MgZHN0LCB1aW50IHdhZCkgZXh0ZXJuYWwgcmV0dXJucyAoYm9vbCkgewogICAgICAgIHJldHVybiB0cmFuc2ZlckZyb20obXNnLnNlbmRlciwgZHN0LCB3YWQpOwogICAgfQoKICAgIGZ1bmN0aW9uIHRyYW5zZmVyRnJvbShhZGRyZXNzIHNyYywgYWRkcmVzcyBkc3QsIHVpbnQgd2FkKQogICAgICAgIHB1YmxpYwogICAgICAgIHN0b3BwYWJsZQogICAgICAgIHJldHVybnMgKGJvb2wpCiAgICB7CiAgICAgICAgaWYgKHNyYyAhPSBtc2cuc2VuZGVyICYmIGFsbG93YW5jZVtzcmNdW21zZy5zZW5kZXJdICE9IHVpbnQoLTEpKSB7CiAgICAgICAgICAgIHJlcXVpcmUoYWxsb3dhbmNlW3NyY11bbXNnLnNlbmRlcl0gPj0gd2FkLCAiZHMtdG9rZW4taW5zdWZmaWNpZW50LWFwcHJvdmFsIik7CiAgICAgICAgICAgIGFsbG93YW5jZVtzcmNdW21zZy5zZW5kZXJdID0gc3ViKGFsbG93YW5jZVtzcmNdW21zZy5zZW5kZXJdLCB3YWQpOwogICAgICAgIH0KCiAgICAgICAgcmVxdWlyZShiYWxhbmNlT2Zbc3JjXSA+PSB3YWQsICJkcy10b2tlbi1pbnN1ZmZpY2llbnQtYmFsYW5jZSIpOwogICAgICAgIGJhbGFuY2VPZltzcmNdID0gc3ViKGJhbGFuY2VPZltzcmNdLCB3YWQpOwogICAgICAgIGJhbGFuY2VPZltkc3RdID0gYWRkKGJhbGFuY2VPZltkc3RdLCB3YWQpOwoKICAgICAgICBlbWl0IFRyYW5zZmVyKHNyYywgZHN0LCB3YWQpOwoKICAgICAgICByZXR1cm4gdHJ1ZTsKICAgIH0KCiAgICBmdW5jdGlvbiBwdXNoKGFkZHJlc3MgZHN0LCB1aW50IHdhZCkgZXh0ZXJuYWwgewogICAgICAgIHRyYW5zZmVyRnJvbShtc2cuc2VuZGVyLCBkc3QsIHdhZCk7CiAgICB9CgogICAgZnVuY3Rpb24gcHVsbChhZGRyZXNzIHNyYywgdWludCB3YWQpIGV4dGVybmFsIHsKICAgICAgICB0cmFuc2ZlckZyb20oc3JjLCBtc2cuc2VuZGVyLCB3YWQpOwogICAgfQoKICAgIGZ1bmN0aW9uIG1vdmUoYWRkcmVzcyBzcmMsIGFkZHJlc3MgZHN0LCB1aW50IHdhZCkgZXh0ZXJuYWwgewogICAgICAgIHRyYW5zZmVyRnJvbShzcmMsIGRzdCwgd2FkKTsKICAgIH0KCgogICAgZnVuY3Rpb24gbWludCh1aW50IHdhZCkgZXh0ZXJuYWwgewogICAgICAgIG1pbnQobXNnLnNlbmRlciwgd2FkKTsKICAgIH0KCiAgICBmdW5jdGlvbiBidXJuKHVpbnQgd2FkKSBleHRlcm5hbCB7CiAgICAgICAgYnVybihtc2cuc2VuZGVyLCB3YWQpOwogICAgfQoKICAgIGZ1bmN0aW9uIG1pbnQoYWRkcmVzcyBndXksIHVpbnQgd2FkKSBwdWJsaWMgYXV0aCBzdG9wcGFibGUgewogICAgICAgIGJhbGFuY2VPZltndXldID0gYWRkKGJhbGFuY2VPZltndXldLCB3YWQpOwogICAgICAgIHRvdGFsU3VwcGx5ID0gYWRkKHRvdGFsU3VwcGx5LCB3YWQpOwogICAgICAgIGVtaXQgTWludChndXksIHdhZCk7CiAgICB9CgogICAgZnVuY3Rpb24gYnVybihhZGRyZXNzIGd1eSwgdWludCB3YWQpIHB1YmxpYyBhdXRoIHN0b3BwYWJsZSB7CiAgICAgICAgaWYgKGd1eSAhPSBtc2cuc2VuZGVyICYmIGFsbG93YW5jZVtndXldW21zZy5zZW5kZXJdICE9IHVpbnQoLTEpKSB7CiAgICAgICAgICAgIHJlcXVpcmUoYWxsb3dhbmNlW2d1eV1bbXNnLnNlbmRlcl0gPj0gd2FkLCAiZHMtdG9rZW4taW5zdWZmaWNpZW50LWFwcHJvdmFsIik7CiAgICAgICAgICAgIGFsbG93YW5jZVtndXldW21zZy5zZW5kZXJdID0gc3ViKGFsbG93YW5jZVtndXldW21zZy5zZW5kZXJdLCB3YWQpOwogICAgICAgIH0KCiAgICAgICAgcmVxdWlyZShiYWxhbmNlT2ZbZ3V5XSA+PSB3YWQsICJkcy10b2tlbi1pbnN1ZmZpY2llbnQtYmFsYW5jZSIpOwogICAgICAgIGJhbGFuY2VPZltndXldID0gc3ViKGJhbGFuY2VPZltndXldLCB3YWQpOwogICAgICAgIHRvdGFsU3VwcGx5ID0gc3ViKHRvdGFsU3VwcGx5LCB3YWQpOwogICAgICAgIGVtaXQgQnVybihndXksIHdhZCk7CiAgICB9CgogICAgZnVuY3Rpb24gc3RvcCgpIHB1YmxpYyBhdXRoIHsKICAgICAgICBzdG9wcGVkID0gdHJ1ZTsKICAgICAgICBlbWl0IFN0b3AoKTsKICAgIH0KCiAgICBmdW5jdGlvbiBzdGFydCgpIHB1YmxpYyBhdXRoIHsKICAgICAgICBzdG9wcGVkID0gZmFsc2U7CiAgICAgICAgZW1pdCBTdGFydCgpOwogICAgfQoKCiAgICBmdW5jdGlvbiBzZXROYW1lKHN0cmluZyBtZW1vcnkgbmFtZV8pIHB1YmxpYyBhdXRoIHsKICAgICAgICBuYW1lID0gbmFtZV87CiAgICB9Cn0KCg==",
      compiled: {},
      compilerList: [
        "soljson-v0.8.11+commit.d7f03943.js",
        "soljson-v0.8.10+commit.fc410830.js",
        "soljson-v0.8.9+commit.e5eed63a.js",
        "soljson-v0.8.8+commit.dddeac2f.js",
        "soljson-v0.8.7+commit.e28d00a7.js",
        "soljson-v0.8.6+commit.11564f7e.js",
        "soljson-v0.8.5+commit.a4f2e591.js",
        "soljson-v0.8.4+commit.c7e474f2.js",
        "soljson-v0.8.3+commit.8d00100c.js",
        "soljson-v0.8.2+commit.661d1103.js",
        "soljson-v0.8.1+commit.df193b15.js",
        "soljson-v0.8.0+commit.c7dfd78e.js",
        "soljson-v0.7.6+commit.7338295f.js",
        "soljson-v0.7.5+commit.eb77ed08.js",
        "soljson-v0.7.4+commit.3f05b770.js",
        "soljson-v0.7.3+commit.9bfce1f6.js",
        "soljson-v0.7.2+commit.51b20bc0.js",
        "soljson-v0.7.1+commit.f4a555be.js",
        "soljson-v0.7.0+commit.9e61f92b.js",
        "soljson-v0.6.12+commit.27d51765.js",
        "soljson-v0.6.11+commit.5ef660b1.js",
        "soljson-v0.6.10+commit.00c0fcaf.js",
        "soljson-v0.6.9+commit.3e3065ac.js",
        "soljson-v0.6.8+commit.0bbfe453.js",
        "soljson-v0.6.7+commit.b8d736ae.js",
        "soljson-v0.6.6+commit.6c089d02.js",
        "soljson-v0.6.5+commit.f956cc89.js",
        "soljson-v0.6.4+commit.1dca32f3.js",
        "soljson-v0.6.3+commit.8dda9521.js",
        "soljson-v0.6.2+commit.bacdbe57.js",
        "soljson-v0.6.1+commit.e6f7d5a4.js",
        "soljson-v0.6.0+commit.26b70077.js",
        "soljson-v0.5.17+commit.d19bba13.js",
        "soljson-v0.5.16+commit.9c3226ce.js",
        "soljson-v0.5.15+commit.6a57276f.js",
        "soljson-v0.5.14+commit.01f1aaa4.js",
        "soljson-v0.5.13+commit.5b0b510c.js",
        "soljson-v0.5.12+commit.7709ece9.js",
        "soljson-v0.5.11+commit.c082d0b4.js",
        "soljson-v0.5.10+commit.5a6ea5b1.js",
        "soljson-v0.5.9+commit.e560f70d.js",
        "soljson-v0.5.8+commit.23d335f2.js",
        "soljson-v0.5.7+commit.6da8b019.js",
        "soljson-v0.5.6+commit.b259423e.js",
        "soljson-v0.5.5+commit.47a71e8f.js",
        "soljson-v0.5.4+commit.9549d8ff.js",
        "soljson-v0.5.3+commit.10d17f24.js",
        "soljson-v0.5.2+commit.1df8f40c.js",
        "soljson-v0.5.1+commit.c8a2cb62.js",
        "soljson-v0.5.0+commit.1d4f565a.js",
        "soljson-v0.4.26+commit.4563c3fc.js",
        "soljson-v0.4.25+commit.59dbf8f1.js",
        "soljson-v0.4.24+commit.e67f0147.js",
        "soljson-v0.4.23+commit.124ca40d.js",
        "soljson-v0.4.22+commit.4cb486ee.js",
        "soljson-v0.4.21+commit.dfe3193c.js",
        "soljson-v0.4.20+commit.3155dd80.js",
        "soljson-v0.4.19+commit.c4cbbb05.js",
        "soljson-v0.4.18+commit.9cf6e910.js",
        "soljson-v0.4.17+commit.bdeb9e52.js",
        "soljson-v0.4.16+commit.d7661dd9.js",
        "soljson-v0.4.15+commit.bbb8e64f.js",
        "soljson-v0.4.14+commit.c2215d46.js",
        "soljson-v0.4.13+commit.0fb4cb1a.js",
        "soljson-v0.4.12+commit.194ff033.js",
        "soljson-v0.4.11+commit.68ef5810.js",
        "soljson-v0.4.10+commit.f0d539ae.js",
        "soljson-v0.4.9+commit.364da425.js",
        "soljson-v0.4.8+commit.60cc1668.js",
        "soljson-v0.4.7+commit.822622cf.js",
        "soljson-v0.4.6+commit.2dabbdf0.js",
        "soljson-v0.4.5+commit.b318366e.js",
        "soljson-v0.4.4+commit.4633f3de.js",
        "soljson-v0.4.3+commit.2353da71.js",
        "soljson-v0.4.2+commit.af6afb04.js",
        "soljson-v0.4.1+commit.4fc6fc2c.js",
        "soljson-v0.4.0+commit.acd334c9.js",
        "soljson-v0.3.6+commit.3fc68da5.js",
        "soljson-v0.3.5+commit.5f97274a.js",
        "soljson-v0.3.4+commit.7dab8902.js",
        "soljson-v0.3.3+commit.4dc1cb14.js",
        "soljson-v0.3.2+commit.81ae2a78.js",
        "soljson-v0.3.1+commit.c492d9be.js",
        "soljson-v0.3.0+commit.11d67369.js",
        "soljson-v0.2.2+commit.ef92f566.js",
        "soljson-v0.2.1+commit.91a6b35f.js",
        "soljson-v0.2.0+commit.4dc2445e.js",
        "soljson-v0.1.7+commit.b4e666cc.js",
        "soljson-v0.1.6+commit.d41f8b7c.js",
        "soljson-v0.1.5+commit.23865e39.js",
        "soljson-v0.1.4+commit.5f6c3cdf.js",
        "soljson-v0.1.3+commit.028f561d.js",
        "soljson-v0.1.2+commit.d0d36e3.js",
        "soljson-v0.1.1+commit.6ff4cd6.js",
      ],
      contractDetail: {
        contractName: '',
        contract: {},
        code: "",
        compiler: "soljson-v0.4.23+commit.124ca40d.js",
      },
      w: null,
      signer: "",
      contractToDeploy: "",
      writeContractInstance: null,
      metaMaskChainIdCorrect: true,
      crustConfig: {
        prefix: 66,
        wss: "wss://rpc.crust.network",
        // wss: "wss://rpc-rocky.crust.network",
        ipfsW3GW: "https://crustipfs.xyz",
      },
      metaMaskChainConfig: {
        chainId: "0x2c",
        chainName: "Crab",
        nativeCurrency: {
          name: "CRAB",
          symbol: "CRAB",
          decimals: 18,
        },
        rpcUrls: ["https://crab-rpc.darwinia.network/"],
        blockExplorerUrls: ["https://crab.subscan.io/"],
      },
    };
  },
  computed: {
    hasExtentionAccount() {
      let result = false;
      if (this.extentionList && this.extentionList.length > 0) {
        result = true;
      }
      return result;
    },
  },
  created() {
    this.init();
    this.initPolkaApi();
  },
  methods: {
    init() {
      if (window.ethereum) {
        window.ethereum.on("accountsChanged", (accounts) => {
          this.setSelectedAccount(accounts && accounts[0]);
        });
        window.ethereum.request({ method: "eth_chainId" }).then((chainId) => {
          this.handleMetaMaskChainIdChange(chainId);
        });
        window.ethereum.on("chainChanged", (chainId) => {
          this.handleMetaMaskChainIdChange(chainId);
        });
      }
      this.connect();
      this.w = work(require.resolve("./worker.js"));
      this.w.addEventListener("message", (event) => {
        let result = event.data;
        if (result.type === "compiled") {
          const output = JSON.parse(result.data);
          if (output.errors && output.errors[0]) {
            this.$notify.error({
              title: "Error",
              message: output.errors[0]["message"],
            });
          } else {
            this.compiled = output;
          }
        } else if (result.type === "error") {
          this.$notify.error({
            title: "Error",
            message: result.data,
          });
        }
        this.isCompiling = false;
      });
      this.contractDetail.code = window.atob(this.exampleSource);
    },
    async initPolkaApi() {
      await web3Enable("Crab Contract Deployer");
      const allAccounts = await web3Accounts();
      _.forEach(allAccounts, (account) => {
        if (account.address) {
          account.address = encodeAddress(
            account.address,
            this.crustConfig.prefix
          );
        }
      });
      this.extentionList = allAccounts || [];
      if (allAccounts && allAccounts.length > 0) {
        this.signer = allAccounts[0].address || "";
      }
      this.api = new ApiPromise({
        provider: new WsProvider(this.crustConfig.wss),
        typesBundle: typesBundleForPolkadot,
      });
      this.api.isReady
        .then(() => {
          this.isApiReady = true;
        })
        .catch((e) => {
          this.isApiReady = false;
          console.log("api ready error: ", e);
        });
    },
    handleMetaMaskChainIdChange(chainId) {
      if (this.metaMaskChainConfig) {
        const targetChainId = this.metaMaskChainConfig.chainId;
        this.metaMaskChainIdCorrect = chainId === targetChainId;
      }
    },
    setSelectedAccount(account) {
      this.connectedAccount = account;
    },
    async switchChain() {
      let chainConfig = this.metaMaskChainConfig;
      if (!chainConfig) {
        return;
      }
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainConfig.chainId }],
          });
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [chainConfig],
              });
            } catch (addError) {
              this.$message({
                type: "error",
                message: addError.message,
              });
            }
          } else {
            this.$message({
              type: "error",
              message: switchError.message,
            });
          }
        }
      }
    },
    deploy() {
      let contract = this.compiled['contracts']['test.sol'][this.contractDetail.contractName];
      if (contract) {
        let contractInstance = new this.web3.eth.Contract(
          contract["abi"]
        );
        contractInstance
          .deploy({
            data:
              "0x" +
              contract["evm"]["bytecode"]["object"],
            arguments: [],
          })
          .send({ from: this.connectedAccount })
          .on("error", (error) => {
            console.log(error);
          })
          .on("confirmation", (confirmationNumber, receipt) => {
            console.log(confirmationNumber);
            console.log(receipt);
          })
          .then((newContractInstance) => {
            if (newContractInstance.options.address) {
              this.$notify({
                title: "Success",
                type: 'success',
                dangerouslyUseHTMLString: true,
                message: `<a href='https://crab.subscan.io/account/${newContractInstance.options.address}' target="_blank">View on Subscan</a>`
              });
            }
            console.log(newContractInstance.options.address); // instance with the new contract address
          });
      }
    },
    connect() {
      this.isLoading = true;
      if (
        window.web3 &&
        window.web3.currentProvider &&
        window.web3.currentProvider.wc
      ) {
        this.connected = true;
        this.isLoading = false;
        return;
      }
      if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        window.ethereum._metamask
          .isUnlocked()
          .then(() => {
            return window.ethereum
              .request({ method: "eth_requestAccounts" })
              .then((res) => {
                this.setSelectedAccount(res && res[0]);
                this.web3 = new Web3(window.web3.currentProvider);
                // this.writeContractInstance = new this.web3.eth.Contract(
                //   this.contractABI,
                //   this.address
                // );
                this.connected = true;
                this.isLoading = false;
              })
              .catch((err) => {
                console.log(err);
              });
          })
          .catch((err) => {
            console.log(err);
          });
      }
    },
    compile() {
      this.isCompiling = true;
      this.w.postMessage({
        code: this.contractDetail.code,
        compiler: this.contractDetail.compiler
      });
    },
    async storeOnCrust() {
      const fileContent = this.contractDetail.code;
      let account = this.signer;
      const injector = await web3FromAddress(account);
      const signRaw = injector?.signer?.signRaw;
      if (!signRaw) {
        return;
      }
      let encoded = encodeAddress(account, this.crustConfig.prefix);
      const { signature } = await signRaw({
        address: encoded,
        data: stringToHex(encoded),
        type: "bytes",
      });
      const authHeaderRaw = `${encoded}:${signature}`;
      const authHeader = Buffer.from(authHeaderRaw).toString("base64");
      const ipfsRemote = create({
        url: `${this.crustConfig.ipfsW3GW}/api/v0`,
        headers: {
          authorization: `Basic ${authHeader}`,
        },
      });
      const rst = await this.addFile(ipfsRemote, fileContent); // Or use IPFS local
      console.log(rst);
      if (this.signer && this.isApiReady) {
        await this.placeStorageOrder(rst.cid, rst.size);
        // while (true) {
        //   const orderStatus = (await this.getOrderState(rst.cid)).toJSON();
        //   console.log("Replica count: ", orderStatus["reported_replica_count"]); // Print the replica count
        //   await new Promise((f) => setTimeout(f, 1500)); // Just wait 1.5s for next chain-query
        // }
      }
    },
    async addFile(ipfs, fileContent) {
      try {
        const result = await ipfs.add(fileContent);
        let cid = result.cid;
        const fileStat = await ipfs.files.stat("/ipfs/" + cid);
        return {
          cid: cid,
          size: fileStat.cumulativeSize,
        };
      } catch (e) {
        console.log(e);
      }
    },
    async placeStorageOrder(fileCid, fileSize) {
      const tips = 0;
      const memo = "";
      const tx = this.api.tx.market.placeStorageOrder(
        fileCid,
        fileSize,
        tips,
        memo
      );
      await this.api.isReadyOrError;
      const injector = await web3FromAddress(this.signer);
      this.api.setSigner(injector.signer);
      return new Promise((resolve, reject) => {
        tx.signAndSend(this.signer, ({ events = [], status }) => {
          console.log(`Tx status: ${status.type}, nonce: ${tx.nonce}`);
          if (status.isInBlock) {
            events.forEach(({ event: { method } }) => {
              if (method === "ExtrinsicSuccess") {
                console.log(`Place storage order success!`);
                this.$notify({
                  title: "Success",
                  type: 'success',
                  dangerouslyUseHTMLString: true,
                  message: `<a href='https://crust.subscan.io/account/${this.signer}' target="_blank">View on Subscan</a>`
                });
                resolve(true);
              }
            });
          } else {
            // Pass it
          }
        }).catch((e) => {
          reject(e);
          this.$notify.error({
            title: "Error",
            message: e,
          });
        });
      });
    },
    selectExtensionAccount() {
      this.$refs["extensionAccountSelect"].toggleMenu();
    },
    changeSigner(signer) {
      this.signer = signer;
    },
    changeCompiler(compiler) {
      this.contractDetail.compiler = compiler;
    },
    changeContract(contractName) {
      this.contractDetail.contractName = contractName;
    },
    async getOrderState(cid) {
      await this.api.isReadyOrError;
      return await this.api.query.market.files(cid);
    },
  },
};
</script>

<style lang="scss" scoped>
.header {
  padding: 1rem;
  .nav-btns {
    display: flex;
    justify-content: flex-end;
  }
  .connected {
    height: 40px;
    line-height: 40px;
    margin: 0 10px;
    font-size: 14px;
  }
  .metamask-btn {
    margin-right: 10px;
  }
}
.main {
  width: 100%;
  max-width: 500px;
  margin-top: 1rem;
  margin-left: auto;
  margin-right: auto;
  .contract-form {
    .el-select {
      width: 100%;
    }
  }
  .main-btns {
    display: flex;
    justify-content: space-between;
    > div {
      // margin-right: 10px;
    }
    button {
      width: 140px;
    }
  }
}
@media (max-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
@media screen and (max-width: $screen-xs) {
  .header {
    .connected {
      display: none;
    }
    > div {
      flex-direction: column;
    }
  }
}
</style>
