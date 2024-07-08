const MiddlewaresLoader     = require('./MiddlewaresLoader');
const ApiHandler            = require("../managers/api/Api.manager");
const UserServer            = require('../managers/http/UserServer.manager');
const ResponseDispatcher    = require('../managers/response_dispatcher/ResponseDispatcher.manager');
const VirtualStack          = require('../managers/virtual_stack/VirtualStack.manager');
const ValidatorsLoader      = require('./ValidatorsLoader');
const ResourceMeshLoader    = require('./ResourceMeshLoader');
const utils                 = require('../libs/utils');

const TokenManager          = require('../managers/entities/token/Token.manager');
const User = require('../managers/entities/user/User.manager');
const School = require('../managers/entities/school/School.manager');
const Classroom = require('../managers/entities/classroom/Classroom.manager');
const MongoLoader           = require('./MongoLoader');
const Student = require('../managers/entities/student/Student.manager');

/** 
 * load sharable modules
 * @return modules tree with instance of each module
*/
module.exports = class ManagersLoader {
    constructor({ config, cortex, cache, oyster, aeon }) {

        this.managers   = {};
        this.config     = config;
        this.cache      = cache;
        this.cortex     = cortex;
        
        this._preload();
        this.injectable = {
            utils,
            cache, 
            config,
            cortex,
            oyster,
            aeon,
            managers: this.managers, 
            validators: this.validators,
            mongomodels: this.mongomodels,
            resourceNodes: this.resourceNodes,
        };
        
    }

    _preload(){
        const validatorsLoader    = new ValidatorsLoader({
            models: require('../managers/_common/schema.models'),
            customValidators: require('../managers/_common/schema.validators'),
        });
        const resourceMeshLoader  = new ResourceMeshLoader({})
        const mongoLoader      = new MongoLoader({ schemaExtension: "mongoModel.js" });

        this.validators           = validatorsLoader.load();
        this.resourceNodes        = resourceMeshLoader.load();
        this.mongomodels          = mongoLoader.load();

    }

    load() {
        this.managers.responseDispatcher  = new ResponseDispatcher();
        const middlewaresLoader           = new MiddlewaresLoader(this.injectable);
        const mwsRepo                     = middlewaresLoader.load();
        this.injectable.mwsRepo           = mwsRepo;
        /*****************************************CUSTOM MANAGERS*****************************************/
        this.managers.token               = new TokenManager(this.injectable);
        this.managers.user                = new User(this.injectable);
        this.managers.school              = new School(this.injectable);
        this.managers.classroom           = new Classroom(this.injectable);
        this.managers.student             = new Student(this.injectable);
        /*************************************************************************************************/
        this.managers.mwsExec             = new VirtualStack({ ...{ preStack: [/* '__token', */'__device',] }, ...this.injectable });
        this.managers.userApi             = new ApiHandler({...this.injectable,...{prop:'httpExposed'}});
        this.managers.userServer          = new UserServer({ config: this.config, managers: this.managers });

       
        return this.managers;

    }

}

