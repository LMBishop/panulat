import os from 'os';

const buildInfo = {
    date: new Date(),
    os: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
    },
    panulat: {
        version: process.env.npm_package_version,
    },
};

export default buildInfo;
