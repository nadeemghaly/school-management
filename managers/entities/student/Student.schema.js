const { isValidObjectId } = require('mongoose');

module.exports = {
    createStudent: [
        {
            model: 'name',
            required: true,
            length: { min: 1, max: 100 }
        },
        {
            model: 'age',
            required: true,
            type: 'number',
            min: 1,
            max: 100
        },
        {
            model: 'classroom',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid classroom ID"
        },
    ],
    updateStudent: [
        {
            model: 'name',
            length: { min: 1, max: 100 }
        },
        {
            model: 'age',
            type: 'number',
            min: 1,
            max: 100
        },
        {
            model: 'classroom',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid classroom ID"
        },
        {
            model: 'email',
            regex: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$',
        },
    ],
    getStudent: [
        {
            model: 'id',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid student ID"
        },
        {
            model: 'email',
            regex: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$',
        },
    ],
    deleteStudent: [
        {
            model: 'id',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid student ID"
        },
        {
            model: 'email',
            regex: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$',
        },
    ],
};