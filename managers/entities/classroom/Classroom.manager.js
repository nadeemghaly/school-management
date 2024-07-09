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
            return { code: 400, error: validationResult };

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
        await this.mongomodels.School.findByIdAndUpdate(
            schoolId,
            { $push: { classrooms: createdClassroom._id } },
            { new: true, useFindAndModify: false }
        );

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
        if (Object.keys(updateFields).length === 0) return { code: 400, error: "No fields provided to update" };

        // Data validation
        let validationResult = await this.validators.Classroom.updateClassroom(updateFields);
        if (validationResult)
            return { code: 400, error: validationResult };

        // Check if the classroom and school exists
        let [classroomInDb, schoolInDb] = await Promise.all([
            this.mongomodels.Classroom.findById(id).populate('school'),
            this.mongomodels.School.findById(schoolId)
        ])
        if (!classroomInDb) return { code: 404, error: "Classroom not found" };
        if (schoolId && !schoolInDb) return { code: 404, error: "School not found" };

        // Check if the current user is the admin of the school
        if (classroomInDb.school.admin.toString() !== __token._id.toString()) {
            return { code: 403, error: "Forbidden, you are not the admin of the school that currently contains this classroom" };
        }

        // Check if the classroom already exists in the new school
        if (schoolId != classroomInDb.school.toString()) {
            let name = updateFields.name? updateFields.name : classroomInDb.name;
            let classroomInDb2 = await this.mongomodels.Classroom.findOne({ name, school: schoolId });
            if (classroomInDb2 && classroomInDb2._id.toString() !== id) return { code: 409, error: "A classroom in the new school with this name already exists" };
        }

        // Update Logic
        let updatedClassroom = await this.mongomodels.Classroom.findByIdAndUpdate(id, updateFields, { new: true });

        if (schoolId != classroomInDb.school._id.toString()) {
            await this.mongomodels.School.findByIdAndUpdate(
                schoolId,
                { $push: { classrooms: updatedClassroom._id } },
                { new: true, useFindAndModify: false }
            );
            
            await this.mongomodels.School.findByIdAndUpdate(
                classroomInDb.school,
                { $pull: { classrooms: updatedClassroom._id } },
                { new: true, useFindAndModify: false }
            );
        }

        // Response
        return {
            updatedClassroom
        };
    }

    async getClassroom({ __token, __query }) {
        const classroomId = __query.id;

        // Validate input
        const validationResult = await this.validators.Classroom.getClassroom({ id: classroomId });
        if (validationResult) return { code: 400, error: validationResult };

        let classroom;
        if (classroomId) {
            // Find by ID
            classroom = await this.mongomodels.Classroom.findById(classroomId)
                .populate({
                    path: 'school',
                    select: 'name admin',
                    populate: {
                        path: 'admin',
                        select: 'name email'
                    }
                })
                .populate({
                    path: 'students',
                    select: 'name'
                });

            if (!classroom) return { code: 404, error: "Classroom not found" };
            else if (classroom.school.admin._id.toString() !== __token._id.toString()) {
                return { code: 403, error: "Forbidden, you are not the admin of this school" };
            }
        }

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

        let validationResult = await this.validators.Classroom.deleteClassroom({ id });
        if (validationResult) return { code: 400, error: validationResult };

        if (id) {
            // Find and delete by ID
            const classroom = await this.mongomodels.Classroom.findById(id);
            if (!classroom) return { code: 404, error: "Classroom not found" };
            if (classroom.students.length > 0) return { code: 409, error: "Classroom has students, cannot be deleted, delete students first" };

            await this.mongomodels.Classroom.findByIdAndDelete(id);
            await this.mongomodels.School.findByIdAndUpdate(
                classroom.school,
                { $pull: { classrooms: classroom._id } },
                { new: true }
            )

            return {
                message: 'Classroom successfully deleted'
                        };
        } else {
            return { code: 400, error: "id must be provided" };
        }

    }
}