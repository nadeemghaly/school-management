module.exports = class Student {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.studentsCollection = "students";
        this.httpExposed = ['post=createStudent', 'put=updateStudent', 'delete=deleteStudent', 'get=getStudent', 'get=getAllStudents'];
    }

    async createStudent({ __token, classroomId, name, email, age }) {
        const student = { name, age, email, classroom: classroomId };

        // Data validation
        let validationResult = await this.validators.Student.createStudent(student);
        if (validationResult)
            return { code: 400, error: validationResult };

        // Check if the student email already exists
        let studentInDb = await this.mongomodels.Student.findOne({ email });
        if (studentInDb) return { code: 409, error: "A student with this email already exists" };

        // Check if the classroom exists
        let classroomInDb = await this.mongomodels.Classroom.findById(classroomId);
        if (!classroomInDb) return { code: 404, error: "Classroom not found" };

        // Check if the current user is the admin of the school associated with the classroom
        let schoolInDb = await this.mongomodels.School.findById(classroomInDb.school);
        if (schoolInDb.admin.toString() !== __token._id.toString()) {
            return { code: 403, error: "Forbidden, you are not the admin of the school associated with this classroom" };
        }

        // Creation Logic
        let createdStudent = await this.mongomodels.Student.create(student);
        await this.mongomodels.Classroom.findByIdAndUpdate(
            classroomId,
            { $push: { students: createdStudent._id } },
            { new: true, useFindAndModify: false }
        );


        // Response
        return {
            createdStudent
        };
    }

    async updateStudent({ __token, __query, name, email, age, classroomId }) {
        const id = __query.id;
        if (!id) return { code: 400, error: "Id must be provided" };

        // Create the update object
        const updateFields = { id };
        if (name) updateFields.name = name;
        if (email) updateFields.email = email;
        if (age) updateFields.age = age;
        if (classroomId) updateFields.classroom = classroomId;

        // Data validation
        let validationResult = await this.validators.Student.updateStudent(updateFields);
        if (validationResult)
            return { code: 400, error: validationResult };

        // Check if the student exists
        let studentInDb = await this.mongomodels.Student.findById(id);
        if (!studentInDb) return { code: 404, error: "Student not found" };

        // Check if the student email already exists
        if (email && email !== studentInDb.email) {
            let studentInDb = await this.mongomodels.Student.findOne({ email });
            if (studentInDb) return { code: 409, error: "A student with this email already exists" };
        }

        // Check if the current user is the admin of the school associated with the student's classroom
        let classroomInDb = await this.mongomodels.Classroom.findById(studentInDb.classroom);
        let schoolInDb = await this.mongomodels.School.findById(classroomInDb.school);
        if (schoolInDb.admin.toString() !== __token._id.toString()) {
            return { code: 403, error: "Forbidden, you are not the admin of the school associated with this student" };
        }

        // Update Logic
        let updatedStudent = await this.mongomodels.Student.findByIdAndUpdate(id, updateFields, { new: true });
        if (classroomId != studentInDb.classroom) {
            await this.mongomodels.Classroom.findByIdAndUpdate(
                classroomId,
                { $push: { students: updatedStudent._id } },
                { new: true, useFindAndModify: false }
            );
            await this.mongomodels.Classroom.findByIdAndUpdate(
                studentInDb.classroom,
                { $pull: { students: updatedStudent._id } },
                { new: true, useFindAndModify: false }
            );
        }

        // Response
        return {
            updatedStudent
        };
    }

    async getStudent({ __token, __query }) {
        const id = __query.id;
        const email = __query.email;

        // Validate input
        let validationResult = await this.validators.Student.getStudent({ id, email });
        if (validationResult) return { code: 400, error: validationResult };

        let student;
        if (id) {
            // Find by ID
            student = await this.mongomodels.Student.findById(id).populate('classroom', 'name school');
            if (!student) return { code: 404, error: "Student not found" };
        } else if (email) {
            // Find by email case insensitive
            student = await this.mongomodels.Student.findOne({
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            }).populate('classroom', 'name school');
            if (!student) return { code: 404, error: "Student not found" };
        } else {
            return { code: 400, error: "Either 'id' or 'name' must be provided" };
        }

        // Check if the current user is the admin of the school associated with the student's classroom
        let classroomInDb = await this.mongomodels.Classroom.findById(student.classroom);
        let schoolInDb = await this.mongomodels.School.findById(classroomInDb.school);
        if (schoolInDb.admin.toString() !== __token._id.toString()) {
            return { code: 403, error: "Forbidden, you are not the admin of the school associated with this student" };
        }

        // Response
        return {
            student
        };
    }

    async getAllStudents({ __token, __isSuperAdmin }) {
        try {
            // Fetch all students
            const students = await this.mongomodels.Student
                .find()
                .populate({
                    path: 'classroom',
                    select: 'name school',  // Include 'name' and 'school' fields from the 'classroom' document
                    populate: {
                        path: 'school',
                        select: 'name'  // Include only the 'name' field from the 'school' document
                    }
                });
            // Response
            return {
                data: students,
                totalCount: students.length
            };
        } catch (error) {
            // Error handling
            return { code: 500, error: 'An error occurred while fetching students' };
        }
    }

    async deleteStudent({ __token, __query }) {
        const id = __query.id;
        const email = __query.email;

        if (id) {
            // Find and delete by ID
            const student = await this.mongomodels.Student.findById(id);
            if (!student) return { code: 404, error: "Student not found" };

            // Check if the current user is the admin of the school associated with the student's classroom
            let classroomInDb = await this.mongomodels.Classroom.findById(student.classroom);
            let schoolInDb = await this.mongomodels.School.findById(classroomInDb.school);
            if (schoolInDb.admin.toString() !== __token._id.toString()) {
                return { code: 403, error: "Forbidden, you are not the admin of the school associated with this student" };
            }

            await this.mongomodels.Student.findByIdAndDelete(id);
            await this.mongomodels.Classroom.findByIdAndUpdate(
                student.classroom,
                { $pull: { students: student._id } },
                { new: true }
            )
        } else if (email) {
            // Find and delete by email
            const student = await this.mongomodels.Student.findOne({ email });
            if (!student) return { code: 404, error: "Student not found" };

            // Check if the current user is the admin of the school associated with the student's classroom
            let classroomInDb = await this.mongomodels.Classroom.findById(student.classroom);
            let schoolInDb = await this.mongomodels.School.findById(classroomInDb.school);
            if (schoolInDb.admin.toString() !== __token._id.toString()) {
                return { code: 403, error: "Forbidden, you are not the admin of the school associated with this student" };
            }

            await this.mongomodels.Student.deleteOne({ email });
            await this.mongomodels.Classroom.findByIdAndUpdate(
                student.classroom,
                { $pull: { students: student._id } },
                { new: true }
            )
        } else {
            return { code: 400, error: "Either 'id' or 'email' must be provided" };
        }

        // Response
        return {
            message: 'Student successfully deleted'
        };
    }
}