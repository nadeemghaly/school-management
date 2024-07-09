module.exports = class School {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.usersCollection = "schools";
        this.httpExposed = ['post=createSchool', 'patch=updateSchool', 'delete=deleteSchool', 'get=getSchool', 'get=getAllSchools'];
    }

    /**
 * @swagger
 * /school/createSchool:
 *   post:
 *     summary: Create a new school
 *     description: Creates a new school and associates it with an admin user.
 *     tags:
 *       - Schools
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminEmail:
 *                 type: string
 *                 description: Email address of the admin to be associated with the school.
 *                 example: admin@gmail.com
 *               name:
 *                 type: string
 *                 description: Name of the school.
 *                 example: school one
 *               address:
 *                 type: string
 *                 description: Address of the school.
 *                 example: 123 main street
 *               mobileNumber:
 *                 type: string
 *                 description: Mobile number for the school contact.
 *                 example: 123-456-7890
 *             required:
 *               - adminEmail
 *               - name
 *               - address
 *               - mobileNumber
 *     responses:
 *       '200':
 *         description: Successfully created the school.
 *       '400':
 *         description: Bad request. Validation failed.
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden. The user is not a super admin.
 *       '404':
 *         description: Admin with the provided email not found.
 *       '409':
 *         description: Conflict. A school with the provided name already exists.
 */
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

/**
 * @swagger
 * /school/updateSchool:
 *   patch:
 *     summary: Update an existing school
 *     description: Updates the details of an existing school and optionally associates it with a new admin user.
 *     tags:
 *       - Schools
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the school to delete.
 *         example: 60d0fe4f5311236168a109ca.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the school.
 *                 example: Updated School Name
 *               address:
 *                 type: string
 *                 description: The new address of the school.
 *                 example: 456 New Street
 *               mobileNumber:
 *                 type: string
 *                 description: The new mobile number for the school contact.
 *                 example: 987-654-3210
 *               admin:
 *                 type: string
 *                 description: Email address of the new admin to be associated with the school.
 *                 example: newadmin@gmail.com
 *             required:
 *               - id
 *     responses:
 *       '200':
 *         description: Successfully updated the school.
 *       '400':
 *         description: Bad request. Validation failed or no fields provided to update.
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden. You are not the school admin.
 *       '404':
 *         description: School or admin not found.
 */
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

    /**
 * @swagger
 * /school/getSchool:
 *   get:
 *     summary: Retrieve a school by ID or name
 *     description: Retrieves the details of a school by its ID or name, including admin and classrooms information.
 *     tags:
 *       - Schools
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: The ID of the school to delete. (Required if `name` is not provided)
 *         example: 668d370886f8aed84c356045
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: The name of the school to retrieve. (Required if `id` is not provided)
 *         example: My School
 *     responses:
 *       '200':
 *         description: Successfully retrieved the school.
 *       '400':
 *         description: Bad request. Validation failed or neither 'id' nor 'name' provided.
 *       '403':
 *         description: Forbidden. You are not the school admin.
 *       '404':
 *         description: School not found.
 */
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

    /**
 * @swagger
 * /school/getAllSchools:
 *   get:
 *     summary: Retrieve all schools
 *     description: Fetches all schools including their admin and classrooms information.
 *     tags:
 *       - Schools
 *     responses:
 *       '200':
 *         description: Successfully retrieved all schools.
 *       '500':
 *         description: An error occurred while fetching schools.
 */

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

    /**
 * @swagger
 * /school/deleteSchool:
 *   delete:
 *     summary: Delete a school by ID or name
 *     description: Deletes a school by its ID or name. Only the school admin can delete the school, and the school must not have any classrooms.
 *     tags:
 *       - Schools
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: The ID of the school to delete. (Required if `name` is not provided)
 *         example: 60d0fe4f5311236168a109ca
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: The name of the school to delete. (Required if `id` is not provided)
 *         example: My School
 *     responses:
 *       '200':
 *         description: School successfully deleted.
 *       '400':
 *         description: Bad request. Either 'id' or 'name' must be provided.
 *       '403':
 *         description: Forbidden. You are not the school admin or the school has classrooms.
 *       '404':
 *         description: School not found.
 */
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
