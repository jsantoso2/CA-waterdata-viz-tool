import { useEffect, useRef } from "react";


/** Hook that returns last used value */
function usePrevious(value){
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export default usePrevious;