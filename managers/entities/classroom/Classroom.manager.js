module.exports = class Classroom {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.classroomsCollection = "classrooms";
        this.httpExposed = ['post=createClassroom', 'put=updateClassroom', 'delete=deleteClassroom', 'get=getClassroom', 'get=getAllClassrooms'];
    }

    async createClassroom({ __token, schoolId, name }) {
        const classroom = { name, school: schoolId };

        // Data validation
        let validationResult = await this.validators.Classroom.createClassroom(classroom);
        if (validationResult)
 return { code: 400, error: validationResult};

        // Check if the school exists
        let schoolInDb = await this.mongomodels.School.findById(schoolId);
        if (!schoolInDb) return { code: 404, error: "School not found" };

        // Check if the current user is the admin of the school
        if (schoolInDb.admin.toString() !== __token._id.toString()) {
            return { code: 403, error: "Forbidden, you are not the admin of this school" };
        }

        // Check if the classroom already exists
        let classroomInDb = await this.mongomodels.Classroom.findOne({ name, school: schoolId });
        if (classroomInDb) return { code: 409, error: "A classroom in the same school with this name already exists" };

        // Creation Logic
        let createdClassroom = await this.mongomodels.Classroom.create(classroom);

        // Response
        return {
            createdClassroom
        };
    }

    async updateClassroom({ __token, __query, name, schoolId }) {
        const id = __query.id;
        if (!id) return { code: 400, error: "Id must be provided" };

        // Create the update object
        const updateFields = {};
        if (name) updateFields.name = name;
        if (schoolId) updateFields.school = schoolId;

        // Data validation
        let validationResult = await this.validators.Classroom.updateClassroom(updateFields);
        if (validationResult)
 return { code: 400, error: validationResult};

        // Check if the classroom and school exists
        let [classroomInDb, schoolInDb] = await Promise.all([
            this.mongomodels.Classroom.findById(id),
            this.mongomodels.School.findById(schoolId)
        ])
        if (!classroomInDb) return { code: 404, error: "Classroom not found" };
        if (!schoolInDb) return { code: 404, error: "School not found" };

        // Update Logic
        let updatedClassroom = await this.mongomodels.Classroom.findByIdAndUpdate(id, updateFields, { new: true });

        // Response
        return {
            updatedClassroom
        };
    }

    async getClassroom({ __token, __query }) {
        const id = __query.id;
        const name = __query.name;

        // Validate input
        let validationResult = await this.validators.Classroom.getClassroom({ id, name });
        if (validationResult) return { code: 400, error: validationResult};

        let classroom;
        if (id) {
            // Find by ID
            classroom = await this.mongomodels.Classroom.findById(id).populate({
                path: 'school',
                select: 'name' 
            }).populate({
                path: 'students',
                select: 'name'
            });
            
            if (!classroom) return { code: 404, error: "Classroom not found" };
        } else if (name) {
            // Find by name case insensitive
            classroom = await this.mongomodels.Classroom.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }).populate({
                path: 'school',
                select: 'name' 
            }).populate({
                path: 'students',
                select: 'name'
            });

            if (!classroom) return { code: 404, error: "Classroom not found" };
        } else {
            return { code: 400, error: "Either 'id' or 'name' must be provided" };
        }

        // Response
        return {
            classroom
        };
    }

    async getAllClassrooms({ __token, __isSuperAdmin }) {
        try {
            // Fetch all classrooms
            const classrooms = await this.mongomodels.Classroom.find().populate({
                path: 'school',
                select: 'name' 
            }).populate({
                path: 'students',
                select: 'name'
            });

            // Response
            return {
                data: classrooms,
                totalCount: classrooms.length
            };
        } catch (error) {
            // Error handling
            return { code: 500, error: 'An error occurred while fetching classrooms' };
        }
    }

    async deleteClassroom({ __token, __query }) {
        const id = __query.id;
        const name = __query.name;

        let validationResult = await this.validators.Classroom.deleteClassroom({ id, name });
        if (validationResult) return { code: 400, error: validationResult};

        let deletionResult;
        if (id) {
            // Find and delete by ID
            const classroom = await this.mongomodels.Classroom.findById(id);
            if (!classroom) return { code: 404, error: "Classroom not found" };

            deletionResult = await this.mongomodels.Classroom.findByIdAndDelete(id);
        } else if (name) {
            // Find and delete by name
            const classroom = await this.mongomodels.Classroom.findOne({ name });
            if (!classroom) return { code: 404, error: "Classroom not found" };

            deletionResult = await this.mongomodels.Classroom.deleteOne({ name });
        } else {
            return { code: 400, error: "Either 'id' or 'name' must be provided" };
        }

        // Response
        return {
            message: 'Classroom successfully deleted',
            result: deletionResult
        };
    }
}