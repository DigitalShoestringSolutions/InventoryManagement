import React from "react";
import { Table } from "react-bootstrap";

export function ListTable({ dataset, fields, nested = [], get_warnings = () => ({ row_class: "", icon: "" }) }) {
    return <Table bordered size="sm" className="mb-0">
        <colgroup>
            <col span="1" style={{ width: "10px" }} />
            {fields.map(elem => <col key={elem.key} style={{ width: "400px" }} />)}
            {nested.map(elem => <col key={elem.key} style={{ width: "800px" }} />)}
        </colgroup>
        <thead>
            <tr>
                <th />
                {fields.map(elem => <th key={elem.key}>{elem.label}</th>)}
                {nested.map(elem => <th key={elem.key}>{elem.label}</th>)}
            </tr>
        </thead>
        <tbody>
            {dataset.map(elem =>
                <ListTableItem key={elem.id} entry={elem} fields={fields} nested={nested} get_warnings={get_warnings} />
            )}
        </tbody>
    </Table>
}


function get_nested(obj, nested_key) {
    let key_fragments = nested_key.split('.')
    var tmp = obj
    while (key_fragments.length > 0) {
        let fragment = key_fragments.shift()
        tmp = tmp[fragment]
    }
    return tmp
}

function ListTableItem({ entry, fields, nested, get_warnings }) {
    let warnings = get_warnings(entry)
    return <tr className={warnings.row_class}>
        <td>{warnings.icon}</td>
        {fields.map(field => <td key={field.key}>{get_nested(entry, field.key)}</td>)}
        {nested.map(nested_field => {
            let Element = nested_field.element
            if (Element)
                return <td key={nested_field.key} className="p-0"><Element data={entry[nested_field.key]} /></td>
            else
                return <td key={nested_field.key} >Error</td>
        })
        }
    </tr>
}

