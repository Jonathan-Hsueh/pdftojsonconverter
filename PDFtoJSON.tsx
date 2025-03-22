import {useState} from "react";
import { pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";

interface ConvertProps {
    pdfFile: string | File | { data: Uint8Array } | { url: string };
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

function PDFtoJSON({ pdfFile }: ConvertProps) {
    const [jsonData, setJsonData] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(1);

    //Handle all kinds of files for better reading
    const convertFileToBlob = async (file: string | File | { data: Uint8Array } | { url: string }) => {
        if (file instanceof File) {
            return file;
        }
        if (file instanceof Uint8Array) {
            return new Blob([file], { type: "application/pdf" });
        }
        if (typeof file === "string") {
            return fetch(file).then((res) => res.blob());
        }
        if ((file as {url : string}).url) { //Type guard for pdf's with URLs
            const response = await fetch((file as {url : string}).url);
            return await response.blob();
        }

        throw new Error("Invalid file type");
    };

    const handleConvertToJson = async () => {
        if (!pdfFile) return;
        try{
            const blob = await convertFileToBlob(pdfFile);
            const reader = new FileReader();
            reader.onload = async (e) => {
                const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
                const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
                let textContent = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items
                        .map((item) => {
                            if ('str' in item) { //Only TextItem has str property
                                return item.str;
                            }
                            return '';
                        })
                        .join(' ');
                }

                const json = {text : textContent};
                setJsonData(json);

                const jsonBlob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }); //Convert to string blob
                const jsonUrl = URL.createObjectURL(jsonBlob);
                const a = document.createElement("a"); 
                a.href = jsonUrl;
                a.download = "converted.json";
                a.click();
                URL.revokeObjectURL(jsonUrl);
            };
            reader.readAsArrayBuffer(blob);
        }
        catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <Button onClick={handleConvertToJson}>Convert to JSON</Button>
        </div>
    );
}

export default PDFtoJSON;
