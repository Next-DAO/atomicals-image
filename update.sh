#!/bin/bash

version=${1:-"master"}

git subtree pull --prefix=atomicals-js  https://github.com/atomicals/atomicals-js.git ${version} --squash