#!/bin/sh
sudo apt-get update
sudo apt install -y ca-certificates fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
sudo add-apt-repository -y ppa:git-core/ppa
sudo apt update
sudo apt install -y git
git --version
cd ~
git clone https://github.com/tosdr/ota-engine engine
git clone https://github.com/tosdr/tosdr-declarations declarations
cd declarations
git checkout removals
git pull
git commit-graph write --reachable --changed-paths
cd ../engine
ln -s ../declarations/declarations
mkdir data
cd data
git clone https://github.com/tosdr/tosdr-versions versions
cd versions
git commit-graph write --reachable --changed-paths
git rev-parse HEAD~5 > .git/shallow
cd ..
git clone https://github.com/tosdr/tosdr-snapshots snapshots
cd snapshots
git commit-graph write --reachable --changed-paths
git rev-parse HEAD~5 > .git/shallow
cd ../..
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
