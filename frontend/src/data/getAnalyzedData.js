import { analyzeWafRules } from "./AIRequest";

export default async function getAnalyzedData(dataArray) {
    if (!dataArray || !Array.isArray(dataArray)) {
        throw new Error('Invalid input: dataArray must be an array');
    }

    const hashKey = btoa(JSON.stringify(dataArray)).slice(0, 16);
    const cachedData = localStorage.getItem(hashKey);

    try {
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const response = await analyzeWafRules(dataArray);
        if (response.error) {
            return { rules: [] };
        }

        localStorage.setItem(hashKey, JSON.stringify(response));
        return response;
    } catch (error) {
        console.error('Error in getAnalyzedData:', error);
        return { rules: [] }; // החזרת ערך ברירת מחדל במקרה של שגיאה
    }
}