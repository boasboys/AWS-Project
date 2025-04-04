export const fetchAclsNames = async (region) => {
    const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_BASE_URL

    try {
        const response = await fetch(`${API_BASE_URL}/waf-acls-names/region/${region}`);
        return await response.json();
    } catch (err) {
        console.error('Failed to fetch WAF acls names:', err);
        throw err;
    }
};

export const fetchAclDetail = async (region, name) => {
    try {
        const response = await fetch(`${API_BASE_URL}/waf-acl-details/region/${region}/name/${name}`);
        return await response.json();
    } catch (err) {
        console.error('Failed to fetch WAF rules:', err);
        throw err;
    }
};