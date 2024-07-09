const http = require('http');
const express = require('express');
const bodyParser = require("body-parser");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cors = require('cors');
const app = express();

module.exports = class UserServer {
    constructor({ config, managers }) {
        this.config = config;
        this.userApi = managers.userApi;
    }

    /** for injecting middlewares */
    use(args) {
        app.use(args);
    }

    /** server configs */
    run() {
        app.use(cors({ origin: '*' }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use('/static', express.static('public'));

        /** an error handler */
        app.use((err, req, res, next) => {
            console.error(err.stack)
            res.status(500).send('Something broke!')
        });

        /** a single middleware to handle all */
        app.all('/api/:moduleName/:fnName', this.userApi.mw);

        const swaggerMiddleware = (req, res, next) => {
            const protocol = req.protocol;
            const host = req.get('host');
            const url = `${protocol}://${host}/api`;
        
            req.swaggerOptions = {
                definition: {
                    openapi: "3.1.0",
                    info: {
                        title: "Schhol Management Express API with Swagger",
                        version: "0.1.0",
                        description: "This is a simple CRUD API application made with Express and documented with Swagger"
                    },
                    servers: [
                        {
                            url: url,
                        },
                    ],
                    components: {
                        securitySchemes: {
                            ApiKeyAuth: {
                                type: 'apiKey',
                                in: 'header',
                                name: 'token',
                            },
                        },
                    },
                    security: [
                        {
                            ApiKeyAuth: [],
                        },
                    ],
                },
                apis: ["./**/*.manager.js"],
            };
        
            next();
        };
        
        app.use(swaggerMiddleware);
        
        app.get('/swagger.json', (req, res) => {
            const specs = swaggerJsdoc(req.swaggerOptions);
            res.setHeader('Content-Type', 'application/json');
            res.send(specs);
        });
        
        
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
            swaggerOptions: {
                url: '/swagger.json',
            },
        }));
        
        let server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
        });
    }
}