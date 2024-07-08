module.exports = ({ managers }) => {
    return async ({ req, res, next }) => {
        if(!req.user || req.user.userType != 'superadmin') {
            return managers.responseDispatcher.dispatch(res, {ok: false, code: 403, errors: 'forbidden, this actions needs a superadmin'});
        }
        next();
    }
}