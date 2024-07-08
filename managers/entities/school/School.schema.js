
module.exports = {
    
    createSchool: [
        {
            model: 'name',
            required: true,
        },
        {
            model: 'address',
            required: true,
            length: { min:10 , max: 100 },
        },
        {
            model: 'mobileNumber',
            required: true,
            length: { min:8 , max: 12 },
        },
    ],
    updateSchool: [
        {
            model: 'name'
        },
        {
            model: 'address',
            length: { min:10 , max: 100 },
        },
        {
            model: 'mobileNumber',
            length: { min:8 , max: 12 },
        },
    ],
    getSchool: [
        {
            model: 'id',
            regex: '^[a-f0-9]{24}$'
        },
        {
            model: 'name',
        }
    ]
}


