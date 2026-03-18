const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

exports.encode = (num) => {
    num = typeof num === 'bigint' ? num : BigInt(num);
    let encoded = "";
    while (num > 0n) {
        const remainder = Number(num % 62n);
        encoded = chars[remainder] + encoded;
        num = num / 62n;
    }
    return encoded || "0";
};
