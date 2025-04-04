import { useState, useEffect } from "react";
import getAnalyzedData from "./getAnalyzedData";
import { useThemeContext } from "../context/ThemeContext";

export default function AnalyzedInfoSection({ dataArray, rule }) {
    const [data, setData] = useState(null);
    const { getColor } = useThemeContext();

    useEffect(() => {
        getAnalyzedData(dataArray)
            .then(result => setData(result));
    }, [dataArray, rule]);

    return (
        <section
            className="info-section"
            style={{
                display: data?.rules.length>0? 'block' : 'none',
                backgroundColor: getColor('barBackground'),
                marginBottom: '12px'
            }}
        >
            <h3 style={{ color: getColor('barText') }}>📝 Details</h3>
            <div className="details-container" style={{ marginTop: '4px', color: getColor('barText') }}>
                {data?.rules ? (
                    <>
                        <p style={{ margin: '4px 0' }}>
                            <strong>Type:</strong> {data.rules[rule]?.Type}
                        </p>
                        <p style={{ margin: '4px 0' }}>
                            <strong>Condition:</strong> {data.rules[rule]?.Condition}
                        </p>
                    </>
                ) : (
                    <p>Loading...</p>
                )}
            </div>
        </section>
    );
}