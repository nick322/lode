const Path = require('path')
const Fs = require('fs-extra')

Fs.mkdirpSync(Path.join(__dirname, '../../static/reporters'))
Fs.copySync(Path.join(__dirname, '../../src/lib/reporters/phpunit'), Path.join(__dirname, '../../static/reporters/phpunit'))
