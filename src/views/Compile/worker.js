import * as solc from 'solc/wrapper';
export default function worker (self) {
  self.addEventListener('message', (event) => {
    let evtData = event.data;
    let input = {
      language: "Solidity",
      sources: {
        "test.sol": {
          content: evtData.code,
          // content: window.btoa(unescape(window.encodeURIComponent(exampleSource)))
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        // evmVersion: "default",
        outputSelection: {
          "*": {
            "*": ["*"],
          },
        },
      },
    };
    try {
      self.importScripts(`https://binaries.soliditylang.org/wasm/${evtData.compiler}`)
      const compiler = solc(self.Module);
      let compiled = compiler.compile(JSON.stringify(input));
      const output = JSON.parse(compiled);
      self.postMessage({
        type: 'compiled',
        data: compiled,
      })
      console.log(output);
    } catch (e) {
      self.postMessage({
        type: 'error',
        data: e,
      })
    }
  });
}
