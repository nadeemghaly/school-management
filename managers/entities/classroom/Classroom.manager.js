module.exports = class Classroom {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.classroomsCollection = "classrooms";
        this.httpExposed = ['post=createClassroom', 'patch=updateClassroom', 'delete=deleteClassroom', 'get=getClassroom', 'get=getAllClassrooms'];
    }
/**
 * @swagger
 * /classroom/createClassroom:
 *   post:
 *     summary: Create a new classroom
 *     description: Creates a new classroom and associates it with a school.
 *     tags:
 *       - Classrooms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schoolId:
 *                 type: string
 *                 description: ID of the school to which the classroom belongs.
 *                 example: 60d0fe4f5311236168a109ca
 *               name:
 *                 type: string
 *                 description: Name of the classroom.
 *                 example: Classroom A
 *             required:
 *               - schoolId
 *               - name
 *     responses:
 *       '200':
 *         description: Successfully created the classroom.
 *       '400':
 *         description: Bad request. Validation failed.
 *       '403':
 *         description: Forbidden. You are not the admin of this school.
 *       '404':
 *         description: School not found.
 *       '409':
 *         description: A classroom in the same school with this name already exists.
 */
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

    /**
 * @swagger
 * /classroom/updateClassroom:
 *   patch:
 *     summary: Update an existing classroom
 *     description: Updates the details of an existing classroom and optionally reassigns it to a different school.
 *     tags:
 *       - Classrooms
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the classroom to patch.
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name for the classroom.
 *                 example: Classroom B
 *               schoolId:
 *                 type: string
 *                 description: ID of the new school to which the classroom should be reassigned.
 *                 example: 60d0fe4f5311236168a109cb
 *     responses:
 *       '200':
 *         description: Successfully updated the classroom.
 *       '400':
 *         description: Bad request. Validation failed or no fields provided to update.
 *       '403':
 *         description: Forbidden. You are not the admin of the school that currently contains this classroom.
 *       '404':
 *         description: Classroom or school not found.
 *       '409':
 *         description: A classroom in the new school with this name already exists.
 */
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
/**
 * @swagger
 * /classroom/getClassroom:
 *   get:
 *     summary: Retrieve details of a classroom
 *     description: Fetches the details of a specific classroom by its ID and validates the user's admin status for the associated school.
 *     tags:
 *       - Classrooms
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the classroom to retrieve.
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       '200':
 *         description: Successfully retrieved the classroom details.
 *       '400':
 *         description: Bad request. Validation failed.
 *       '403':
 *         description: Forbidden. You are not the admin of this school.
 *       '404':
 *         description: Classroom not found.
 */
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

    /**
 * @swagger
 * /classroom/getAllClassrooms:
 *   get:
 *     summary: Get all classrooms
 *     description: Retrieves a list of all classrooms, including details of the associated school and students.
 *     tags:
 *       - Classrooms
 *     responses:
 *       '200':
 *         description: Successfully retrieved all classrooms.
 *       '500':
 *         description: Internal server error. An error occurred while fetching the classrooms.
 */
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
/**
 * @swagger
 * /classroom/deleteClassroom:
 *   delete:
 *     summary: Delete a classroom
 *     description: Deletes a classroom by its ID. Ensures that the classroom does not have any students before deletion.
 *     tags:
 *       - Classrooms
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the classroom to delete.
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       '200':
 *         description: Successfully deleted the classroom.
 *       '400':
 *         description: Bad request. ID must be provided.
 *       '404':
 *         description: Classroom not found.
 *       '409':
 *         description: Conflict. Classroom has students and cannot be deleted. Remove students first.
 */
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