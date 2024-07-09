const config                = require('./config/index.config.js');
const ManagersLoader        = require('./loaders/ManagersLoader.js');

process.on('uncaughtException', err => {
    console.log(`Uncaught Exception:`)
    console.log(err, err.stack);

    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at ', promise, `reason:`, reason);
    process.exit(1)
})

// const cache      = require('./cache/cache.dbh')({
//     prefix: config.dotEnv.CACHE_PREFIX ,
//     url: config.dotEnv.CACHE_REDIS
// });

// const Oyster  = require('oyster-db');
// const oyster     = new Oyster({ 
//     url: config.dotEnv.OYSTER_REDIS, 
// 	prefix: config.dotEnv.OYSTER_PREFIX 
// });

// const cortex     = new Cortex({
//     prefix: config.dotEnv.CORTEX_PREFIX,
//     url: config.dotEnv.CORTEX_REDIS,
//     type: config.dotEnv.CORTEX_TYPE,
//     state: ()=>{
//         return {} 
//     },
//     activeDelay: "50",
//     idlDelay: "200",
// });

const managersLoader = new ManagersLoader({config});
const managers = managersLoader.load();

managers.userServer.run();
