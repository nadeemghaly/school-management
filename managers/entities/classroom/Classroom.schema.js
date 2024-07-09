
module.exports = {
    createClassroom: [
        {
            model: 'name',
            required: true,
            length: { min: 1, max: 100 },
        },
        {
            model: 'school',
            required: true,
            regex: '^[a-f0-9]{24}$'
        },
    ],
    updateClassroom: [
        {
            model: 'id',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid classroom ID",
        },
        {
            model: 'name',
            length: { min: 1, max: 100 },
        },
        {
            model: 'school',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid school ID",
        },
    ],
    getClassroom: [
        {
            model: 'id',
            required: true,
            regex: '^[a-f0-9]{24}$',
            error: "Invalid classroom ID",
        },
    ],
    deleteClassroom: [
        {
            model: 'id',
            regex: '^[a-f0-9]{24}$',
            error: "Invalid classroom ID",
        },
        {
            model: 'name',
            length: { min: 1, max: 100 },
        }
    ],
};