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

    /**
 * @swagger
 * /user/signup:
 *   post:
 *     summary: Sign up a new user
 *     description: Creates a new user account with the provided information.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the user.
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 description: Email address of the user.
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 description: Password for the user account.
 *                 example: strongpassword123
 *               userType:
 *                 type: string
 *                 description: Type of the user (e.g., admin, superadmin).
 *                 example: user
 *             required:
 *               - name
 *               - email
 *               - password
 *               - userType
 *     responses:
 *       '200':
 *         description: Successfully created the user.
 *       '400':
 *         description: Bad request. Validation failed.
 *       '409':
 *         description: Conflict. Email already in use.
 */
    async signup({ name, email, password, userType }) {
        const user = { name, email, password, userType };

        // Data validation
        console.log(this.validators)
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

    /**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Log in a user
 *     description: Authenticates a user and returns a token if the login is successful.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address of the user.
 *                 example: admin1@gmail.com
 *               password:
 *                 type: string
 *                 description: Password for the user account.
 *                 example: Password123!
 *             required:
 *               - email
 *               - password
 *     responses:
 *       '200':
 *         description: Successfully logged in. Token returned.
 *       '400':
 *         description: Bad request. Validation failed.
 *       '401':
 *         description: Incorrect username or password.
 */
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
