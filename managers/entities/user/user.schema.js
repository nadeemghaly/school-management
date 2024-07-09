

module.exports = {
    
    createUser: [
        {
            model: 'name',
            required: true,
        },
        {
            model: 'email',
            required: true,
            regex: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$',
        },
        {
            model: 'password',
            required: true,
            minlength: 6
            
        },
        {
            model: 'userType',
            required: true,
            oneOf: ['admin','superadmin'],
        },
    ],
    login: [
        {
            model: 'email',
            required: true,
            regex: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$',
        },
        {
            model: 'password',
            required: true,
        }
    ],
}


