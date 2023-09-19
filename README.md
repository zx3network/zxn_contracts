# ZXN Protocol #

## Deploy ##

To deploy the contract run:

```
npx hardhat run scripts/deploy.js --network localhost
```

Script will look for `contract-addresses.json` file which is in the .gitignore

File should contain XEN and DXN contract addresses:

```js
{
  "xen": "0x5Fb...",
  "dxn": "0xe7f..."
}
```

It will also update the file appending ZXN and ZXN Protocol contract addreses.

## Test ##

To run all tests run:

```
npx hardhat test
```

## Test deplpoy ##

To deploy on the test network (ex: hardhat) first run `deploy_mocks.js` script which will deploy simple mock XEN and DXN contracts with some tokens minted to the deployer address. Script will add XEN and DXN mock addreses into `contract-addresses.json` file:

```
npx hardhat run scripts/deploy_mocks.js --network localhost
```

Next run `deploy.js` which will use XEN and DXN mock addreses:

```
npx hardhat run scripts/deploy.js --network localhost
```

