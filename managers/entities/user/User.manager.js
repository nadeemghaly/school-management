const bcrypt = require('bcrypt');

module.exports = class User {

    constructor({ config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.usersCollection = "users";
        this.httpExposed = ['post=signup', 'post=login'];
    }

    async signup({ name, email, password, userType }) {
        const user = { name, email, password, userType };

        // Data validation
        let validationResult = await this.validators.User.createUser(user);
        if (validationResult) return { code: 400, error: validationResult };

        let userInDB = await this.mongomodels.User.findOne({ email });
        if (userInDB) return { code: 409, error: "Email already in use" }

        // Password Encryption
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        user.password = hashedPassword;

        // Creation Logic
        let createdUser = await this.mongomodels.User.create(user);

        // Response
        return {
            createdUser
        };
    }
    async login({ email, password }) {
    const loginCredentials = { email, password };

    let validationResult = await this.validators.User.login(loginCredentials);
    if (validationResult) return { code: 400, error: validationResult };

    let userInDB = await this.mongomodels.User.findOne({ email });
    if (!userInDB) return { code: 401, error: "Incorrect username or password" };

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, userInDB.password);
    if (!isPasswordValid) return { code: 401, error: "Incorrect username or password" };

    let longToken = this.tokenManager.genLongToken({ userId: userInDB._id, email: userInDB.email });

    // Response
    return {
        token: longToken
    };
}
}
