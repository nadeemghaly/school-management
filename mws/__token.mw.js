module.exports = ({ managers, mongomodels }) => {
    return async ({ req, res, next }) => {
        if (!req.headers.token) {
            console.log('token required but not found')
            return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
        }
        let user = null
        try {
            let decoded = managers.token.verifyLongToken({ token: req.headers.token });
            if (!decoded || !decoded.userId || !decoded.email) {
                console.log('failed to decode-1')
                return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
            };

            const user = await mongomodels.User.findOne({ _id: decoded.userId, email: decoded.email });
            if (!user) {
                console.log('invalid token')
                return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
            }

            req.user = user
        } catch (err) {
            console.log('failed to decode-2')
            return managers.responseDispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
        }
        next(req.user);
    }
}