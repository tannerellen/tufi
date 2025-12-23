# Tufi
### A terminal UI for managing Wi-Fi connections with Network Manager
A better looking alternative to nmtui. Responsive and clean design that makes it quick and easy to manage your wireless connections.

<p align="center">
  <img src="https://github.com/tannerellen/tufi/blob/main/assets/images/tufi-screenshot.png?raw=true" alt="Alt text" width="550">
</p>

## Requirements
- Linux based OS
- Network Manager

## Installation

### Binary Install
You can find the latest binary on the [releases](https://github.com/tannerellen/tufi/releases) page. Download, the release package, uncompress the file and copy the executable to somewhere in your path, for example:
```
/usr/local/bin
```
Then you can launch with:
```
tufi
```

## Usage
- ? will show onscreen help.
- q ctrl + c will quit the app.
- Use arrow keys j,k to navigate up and down lists.
- Ctrl + u, Ctrl + d, will page up and down lists.
- Tab key switches between sections.
- Enter or space key will attempt to connect to a network in unknown networks section.
- Enter or space key will toggle a network connection (connect/disconnect) in known networks section.
- h brings up hidden network connection modal.
- s scans for new networks.
- o (that's the letter o) will toggle your wifi device off or on.
- Escape key will cancel out of any modal dialogs.

Note that this inherits network manager behaviors. If you are already connected to a network then network manager generally will not cache the list of found networks. If you aren't connected the list of known networks is often cached and will show immediately upon launch. If necessary Tufi will automatically scan for networks if it can't get a current list from network manager.

## Run From Source
Tufi uses the [Bun](https://bun.sh/) javascript runtime. Simply ensure Bun is installed, clone this repo then you can launch Tufi by navigation to the repo folder in the terminal and execute the following:
```
bun index.js
```

## Special Thanks
Inspired by [Impala](https://github.com/pythops/impala) an iwd based TUI and [Gazelle](https://github.com/Zeus-Deus/gazelle-tui) another Network Manager TUI.



