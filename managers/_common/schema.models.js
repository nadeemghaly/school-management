
module.exports = {
    id: {
        path: "id",
        type: "string",
    },
    name: {
        path: 'name',
        type: 'string',
        length: {min: 3, max: 20},
    },    
    age: {
        path: 'age',
        type: 'number',
        length: {min: 1, max: 100},
    },
    password: {
        path: 'password',
        type: 'string',
        length: {min: 8, max: 100},
    },
    classroom: {
        path: 'classroom',
        type: 'string',
        length: {min: 24, max: 24},
    },
    school: {
        path: 'school',
        type: 'string',
        length: {min: 24, max: 24},
    },
    email: {
        path: 'email',
        type: 'string',
        length: {min:3, max: 100},
    },
    userType: {
        path: 'userType',
        type: 'string',
        enum: ['admin', 'superadmin']
    },
    address: {
        path: 'address',
        type: 'string',
        length: {min: 10, max: 100},
    },
    mobileNumber: {
        path: 'mobileNumber',
        type: 'string',
        length: {min: 8, max: 12},
    },
}