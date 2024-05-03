<p align=center>
  <img src="https://user-images.githubusercontent.com/11330271/208825167-77d7bc78-17d0-4f33-ad35-d108b6fac730.gif" height="237px" width="344"/>
</p>
<h1 align=center>aresrpg-dapp</h1>
<p align=center>
  <img src="https://img.shields.io/badge/Made%20with-Javascript-%23f7df1e?style=for-the-badge" alt="fully in javascript"/>
  <img src="https://img.shields.io/badge/Powered%20By-Black%20Magic-blueviolet?style=for-the-badge" alt="powered by lsd"/>
  <a href="https://discord.gg/gaqrFT5">
    <img src="https://img.shields.io/discord/265104803531587584.svg?logo=discord&style=for-the-badge" alt="Chat"/>
  </a>
</p>
<h3 align=center>AresRPG is a Browser based MMORPG</h3>

### Hello World

AresRPG has been a minecraft server project for years and is now upgraded to a standalone game on top of [ThreeJS](https://threejs.org/) and [Sui](https://sui.io/), the project is in a very early stage and everyone is welcomed to contribute to its realization

![](https://i.imgur.com/csWCkeW.png)

- Try it out at https://app.aresrpg.world
- Or the beta version at https://testnet.aresrpg.world

## Contribute

The dApp is made to be ran locally by anyone, the only difference with using our domain is that we're using dedidcated Sui nodes while locally it defaults to Mystenlabs shared ones

```sh
git clone git@github.com:aresrpg/dapp.git
cd app
```

- Env

```
VITE_SUI_RPC = 'https://fullnode.testnet.sui.io',
VITE_SUI_WSS = 'wss://fullnode.testnet.sui.io',
VITE_SERVER_URL = 'https://testnet-api.aresrpg.world',
VITE_NETWORK = 'testnet',
```

- Run the client

```
npm install
npm start
```

Once you've made a super cool feature, you can open a pull request on this page 🥇

If it's accepted and significant enough, you'll win the contributor badge in the game !

## Protocol

To understand better how to communicate with the server, check the [protocol repo](https://github.com/aresrpg/aresrpg-protocol), it contains a D2 schema file and the proto definition
