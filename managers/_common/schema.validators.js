module.exports = {
    'name': (data)=>{
        if(data.trim().length < 3){
            return false;
        }
        return true;
    },
}