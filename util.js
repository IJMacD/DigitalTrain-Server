module.exports = {
    streamToString,
    ucfirst,
};

/**
 * 
 * @param {import('stream').Stream} stream 
 * @returns {Promise<string>}
 */
function streamToString (stream) {
    return new Promise((resolve, reject) => {
        let data = "";
    
        stream.on("data", buff => data += buff.toString());

        stream.on("end", () => resolve(data));

        stream.on("error", reject);
    });
}

/**
 * 
 * @param {string} str 
 */
function ucfirst (str) {
    return str.substr(0,1).toUpperCase() + str.substr(1);
}