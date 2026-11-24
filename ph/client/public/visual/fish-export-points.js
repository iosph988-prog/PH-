(() => {
window.fishCheckExport = async count => {
return {
id: crypto.randomUUID(),
user: null,
count
};
};

window.fishChargeExport = async ticket => {
return true;
};
})();
