module.exports = class School {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.usersCollection = "schools";
        this.httpExposed = ['post=createSchool', 'put=updateSchool', 'delete=deleteSchool', 'get=getSchool', 'get=getAllSchools'];
    }
    async createSchool({ __token, __isSuperAdmin, adminEmail, name, address, mobileNumber }) {
        const school = { name, address, mobileNumber };
        // Data validation
        let validationResult = await this.validators.School.createSchool(school);
        if (validationResult)
            return { code: 400, error: validationResult };

        let [schoolInDb, adminInDb] = await Promise.all([this.mongomodels.School.findOne({ name }), this.mongomodels.User.findOne({ email: adminEmail })]);
        if (schoolInDb) return { code: 409, error: "A school with this name already exists" }
        if (!adminInDb) return { code: 404, error: "Admin with provided email not found" }


        // Creation Logic
        school.admin = adminInDb._id;
        let createdchool = await this.mongomodels.School.create(school);

        // Response
        return {
            createdchool
        };
    }

    async updateSchool({ __token, __query, name, address, mobileNumber, admin }) {

        const id = __query.id
        if (!id) return { code: 400, error: "Id must be provided" }

        // Create the update object
        const updateFields = {};
        if (name) updateFields.name = name;
        if (address) updateFields.address = address;
        if (mobileNumber) updateFields.mobileNumber = mobileNumber;
        let validationResult = await this.validators.School.updateSchool(updateFields);
        
        if (admin) {
            const newAdmin = await this.mongomodels.User.findOne({ email: admin })
            if (!newAdmin) return { code: 404, error: "Admin with provided email not found" }
            updateFields.admin = newAdmin._id.toString()
        }

        if (Object.keys(updateFields).length === 0) return { code: 400, error: "No fields provided to update" };

        // Data validation
        if (validationResult)
            return { code: 400, error: validationResult };

        // Check if the school exists
        let schoolInDb = await this.mongomodels.School.findById(id);
        if (!schoolInDb) return { code: 404, error: "School not found" };
        else if (schoolInDb.admin.toString() !== __token._id.toString()) return { code: 403, error: "Forbidden, you are not the school admin" };

        // Update Logic
        let updatedSchool = await this.mongomodels.School.findByIdAndUpdate(id, updateFields, { new: true });

        // Response
        return {
            updatedSchool
        };
    }

    async getSchool({ __token, __query }) {
        const id = __query.id
        const name = __query.name
        const userId = __token._id.toString()

        // Validate input
        let validationResult = await this.validators.School.getSchool({ id, name });
        if (validationResult) return { code: 400, error: validationResult };

        let school;
        if (id) {
            // Find by ID
            school = await this.mongomodels.School.findById(id).populate('admin', 'name email').populate('classrooms', 'name');
            if (!school) return { code: 404, error: "School not found" };
        } else if (name) {
            // Find by name case insensitive
            school = await this.mongomodels.School.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }).populate('admin', 'name email').populate('classrooms', 'name');
            if (!school) return { code: 404, error: "School not found" };
        } else {
            return { code: 400, error: "Either 'id' or 'name' must be provided" };
        }

        // Check if the user is the school admin
        if (school.admin._id.toString() !== userId) return { code: 403, error: "Forbidden, you are not the school admin" };

        // Response
        return {
            school
        };
    }

    async getAllSchools({ __token, __isSuperAdmin }) {
        try {
            // Fetch all schools
            const schools = await this.mongomodels.School.find().populate('admin', 'name email').populate('classrooms', 'name');

            // Response
            return {
                data: schools,
                totalCount: schools.length
            };
        } catch (error) {
            // Error handling
            return { code: 500, error: 'An error occurred while fetching schools' };
        }
    }

    async deleteSchool({ __token, __query }) {
        const id = __query.id
        const name = __query.name

        if (id) {
            // Find and delete by ID
            const school = await this.mongomodels.School.findById(id);
            if (!school) return { code: 404, error: "School not found" };
            else if (school.admin.toString() !== __token._id.toString()) return { code: 403, error: "Forbidden, you are not the school admin" };
            else if (school.classrooms.length > 0) return { code: 403, error: "Forbidden, school has classrooms, please delete classrooms first" };

            await this.mongomodels.School.findByIdAndDelete(id);
        } else if (name) {
            // Find and delete by name
            const school = await this.mongomodels.School.findOne({ name });
            if (!school) return { code: 404, error: "School not found" };
            else if (school.admin.toString() !== __token._id.toString()) return { code: 403, error: "Forbidden, you are not the school admin" };
            else if (school.classrooms.length > 0) return { code: 403, error: "Forbidden, school has classrooms, please delete classrooms first" };
            
            await this.mongomodels.School.deleteOne({ name });
        } else {
            return { code: 400, error: "Either 'id' or 'name' must be provided" };
        }

        // Response
        return {
            message: 'School successfully deleted'
        };
    }

}
