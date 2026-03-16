import React from "react";
import { Badge, Button, Col, Form, InputGroup, Row, Table, Spinner, Alert, Accordion, Card } from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { groupBy } from "../table_utils";
import APIBackend from '../RestAPI'
import { AddItemsPanel } from '../components/add_item_panel'
import { useNavigate } from "react-router-dom";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))

/*
 TODO
 - Ensure to location (and withdrawn_by) are selected
 - Output result on success
 - handle errors
*/



export function TransferPage({ config }) {
    const queryClient = useQueryClient()
    let [from_location, setFromLocation] = React.useState(undefined)
    let [to_location, setToLocation] = React.useState(undefined)

    let [selected_items, setSelectedItems] = React.useState({})

    let [outcome, setOutcome] = React.useState({})
    let [errors, setErrors] = React.useState({})
    let navigate = useNavigate()

    let url = get_url(config)

    const { isLoading, error, data } = useQuery(
        ['available_items', from_location?.id],
        () =>
            fetch('http://' + url + '/list/items/at/' + from_location?.id).then(res =>
                res.json()
            ),
        {
            // The query will not execute until the supplier exists
            enabled: !!from_location,
        }
    )

    const create_mutation = useMutation(
        async (data) => {
            let url = "http://" + get_url(config) + "/action/transfer"
            return APIBackend.api_post(url, data).then((response) => {
                const get_json = async (response) => {
                    let output = await response.json()
                    return { status: response.status, payload: output }
                }
                return get_json(response)
            })
        },
        {
            onSuccess: (result) => {
                console.log(result)
                if (result.status === 200) {
                    setSelectedItems({})
                    queryClient.invalidateQueries({
                        queryKey:
                            ['available_items', from_location?.id]
                    })
                    setOutcome(result.payload)
                } else {
                    setErrors(result.payload)
                }
            }
        }
    )


    let handleSubmit = () => {
        create_mutation.mutate({
            from_location: from_location?.id,
            to_location: to_location?.id,
            items: Object.keys(selected_items).map(key => ({
                id: key,
                quantity: selected_items[key].transfer_quantity
            }))
        })
    }

    return <Card className="mt-3">
        <Card.Header>
            <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                <h2>New Transfer</h2>
                <Button
                    variant="outline-secondary"
                    className="bi bi-arrow-left"
                    onClick={() => navigate("/")}
                >{" "}Back</Button>
            </div>
        </Card.Header>
        <Card.Body>
            <TransferDetails setFromLocation={setFromLocation} setToLocation={setToLocation} to_location={to_location} config={config} />
            <AddItemsPanel
                selected_items={selected_items}
                setSelectedItems={setSelectedItems}
                item_list={data}
                available_title={"Available at \"" + (from_location?.name ?? "")+"\""}
                available_fields={[
                    { key: "name", label: "Item" },
                    { key: "quantity", label: "# Available" },
                    { key: "$select$", label: "Transfer" }
                ]}
                selected_title={"To be Transferred to \"" + (to_location?.name ?? "") + "\""}
                selected_fields={[
                    { key: "name", label: "Item" },
                    { key: "quantity", label: "# Available" },
                    { key: "#transfer_quantity", label: "# Transferred" },
                    { key: "$unselect$", label: "Remove" }
                ]}
                map_on_select={
                    [
                        {
                            value: 0,
                            to: "transfer_quantity"
                        }
                    ]
                }
                right_to_left={false}
            />

            <div className="d-grid mt-2">
                <Button onClick={() => handleSubmit()} disabled={create_mutation.isPending || Object.keys(selected_items).length === 0 || to_location==undefined}>Save</Button>
            </div>


            {create_mutation.isError ? (
                <Alert variant="danger">An error occurred: {create_mutation.error.message}</Alert>
            ) : null}


            {Object.keys(errors).length > 0 ? (
                <Alert variant="danger">Errors Occured: {JSON.stringify(errors)}</Alert>
            ) : null}

            {create_mutation.isSuccess && Object.keys(errors).length === 0 ?
                <Alert variant="success" className="d-flex align-items-baseline justify-content-between"><span>Transferred: {outcome.transferred.map(entry => <span>{entry.item} x {entry.quantity}  </span>)}</span>
                    <Button size="sm" variant="success" onClick={() => navigate('/')}>Close</Button></Alert>
                : null}
        </Card.Body>
    </Card>
}
function TransferDetails({ setFromLocation, config, to_location, setToLocation }) {
    let [locked, setLocked] = React.useState(false)
    let [internal_from_location_id, setInternalFromLocation] = React.useState("")

    let url = get_url(config)
    // const searchParams = new URLSearchParams();
    // searchParams.append("active", "true")

    React.useEffect(() => {
        if(internal_from_location_id === to_location?.id){
            setToLocation("")
        }
    },[internal_from_location_id,to_location,setToLocation])

    const { isLoading, error, data: locations } = useQuery(
        ['location_list'],
        () =>
            fetch('http://' + url + '/list/locations').then(res =>
                res.json()
            )
    )

    let on_lock = () => {
        if (internal_from_location_id !== "") {
            setLocked(true)
            setFromLocation(locations.find(elem => elem.id === internal_from_location_id))
        } else
            window.alert("Please select the location from the dropdown")
    }

    let on_unlock = () => {
        if (confirm("Do you want to change the location - this will clear all items selected so far")) {
            setLocked(false)
            setFromLocation(undefined)
        }
    }

    if (isLoading)
        return <Alert variant="secondary">Loading Location List <Spinner size="sm" /></Alert>

    if (error)
        return <Alert variant="danger">Error: Unable to Load Location List</Alert>

    return <div>
        <InputGroup>
            <InputGroup.Text>Transfer From:</InputGroup.Text>
            <Form.Select value={internal_from_location_id} onChange={event => setInternalFromLocation(event.target.value)} disabled={locked}>
                <option hidden disabled value={""}>Select a location</option>
                {locations.map(entry => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
            </Form.Select>
            {locked ?
                <Button variant="outline-danger" onClick={on_unlock}>Change</Button>
                :
                <Button variant="success" onClick={on_lock}>Select</Button>
            }
        </InputGroup>
        <InputGroup className="mt-2">
            <InputGroup.Text>Transfer To:</InputGroup.Text>
            <Form.Select value={to_location?.id??""} onChange={event => setToLocation(locations.find(elem => elem.id === event.target.value))}>
                <option hidden disabled value={""}>Select a location</option>
                {locations.map(entry => (
                    entry.id !== internal_from_location_id ? <option key={entry.id} value={entry.id}>{entry.name}</option> : null
                ))}
            </Form.Select>
        </InputGroup>
    </div>
}

function AddItemsPanels({
    order_data,
    selected_title = "Delivery Contents",
    available_title = "Expected Items"
}) {
    let [selected_items, setSelectedItems] = React.useState({})
    let available_items = order_data ? order_data.filter(elem => Object.keys(selected_items).indexOf(String(elem.id)) === -1) : []

    const select_item = (item) => {
        console.log(item)
        setSelectedItems(prev => {
            let entry = order_data.find(elem => elem.id === item)
            return {
                ...prev,
                [item]: { ...entry, quantity: entry.remaining }
            }
        })
    }

    const unselect_item = (item) => {
        setSelectedItems(prev => {
            const { [item]: removed, ...rest } = prev;
            return rest;
        })
    }

    const set_quantity = (id, value) => {
        setSelectedItems(prev => ({ ...prev, [id]: { ...prev[id], quantity: value } }))
    }

    return <Row className="mt-2">
        <Col>
            <div className="mb-1">{selected_title}</div>
            <SelectedItemList selected_items={selected_items} set_quantity={set_quantity} unselect_item={unselect_item} />
        </Col>
        <Col>
            <div className="mb-1">{available_title}</div>
            <AvailableItemsAccordian available_items={available_items} select_item={select_item} />
        </Col>
    </Row>
}

function AvailableItemsList({ available_items, select_item }) {
    let grouped_items = groupBy(available_items, "purchase_order")
    console.log(grouped_items)
    return <Table bordered size="sm">
        <thead>
            <tr>
                <th>Purchase Order</th>
                {/* <th>Expected</th> */}
                <th>Item</th>
                <th>Quantity Outstanding</th>
                <th>Add to Delivery</th>
            </tr>
        </thead>
        <tbody>
            {Object.keys(grouped_items).map(entry => (
                <React.Fragment key={entry}>
                    {grouped_items[entry].map((elem, index) => <tr key={elem.id}>
                        {index == 0 ? <>
                            <td rowSpan={grouped_items[entry].length}>{entry}</td>
                            {/* <td rowSpan={available_items[entry].items.length}>{available_items[entry].date_expected_delivery}</td> */}
                        </> : ""}
                        <AvailableItemElement elem={elem} on_click={() => select_item(elem.id)} />
                    </tr>)}
                </React.Fragment>
            ))}
        </tbody>
    </Table>
}

function AvailableItemsAccordian({ available_items, select_item }) {
    let grouped_items = groupBy(available_items, "purchase_order")
    let groups = Object.keys(grouped_items)
    return <Accordion flush alwaysOpen={true}>
        {groups.map(entry => (
            <Accordion.Item key={entry} eventKey={entry}>
                <Accordion.Header>{entry} [{grouped_items[entry][0].expected_delivery}]</Accordion.Header>
                <Accordion.Body className="p-0">
                    <Table bordered size="sm" flush className="mb-1">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Quantity Outstanding</th>
                                <th>Add to Delivery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grouped_items[entry].map((elem, index) => <tr key={elem.id}>
                                <AvailableItemElement elem={elem} on_click={() => select_item(elem.id)} />
                            </tr>)}
                        </tbody>
                    </Table>
                </Accordion.Body>
            </Accordion.Item>
        ))}
    </Accordion>
}


function AvailableItemElement({ elem, on_click }) {
    return <>
        <td>{elem.item}</td>
        <td>{elem.remaining}</td>
        <td className="p-0 py-0"><Button size="sm" variant="outline-primary" className="w-100 h-100 rounded-0" onClick={on_click}>Select</Button></td>
    </>
}

function SelectedItemList({ selected_items, set_quantity, unselect_item }) {
    return <Table bordered size="sm">
        <thead>
            <tr>
                <th>Item</th>
                <th>Purchase Order</th>
                <th>Quantity Delivered</th>
                <th>Remove from Delivery</th>
            </tr>
        </thead>
        <tbody>
            {Object.keys(selected_items).map(id =>
                <SelectedItemElement key={id} elem={selected_items[id]} set_quantity={(value) => set_quantity(id, value)} on_click={() => unselect_item(id)} />
            )}
        </tbody>
    </Table>
}

function SelectedItemElement({ elem, set_quantity, on_click }) {
    return <tr>
        <td>{elem.item}</td>
        <td>{elem.purchase_order}</td>
        <td className="p-1"><Form.Control size="sm" className="w-100 h-100 rounded-0" onChange={(event) => set_quantity(event.target.value)} value={elem.quantity} /></td>
        <td className="p-0 py-1"><Button size="sm" className="w-100 h-100 rounded-0" variant="outline-danger" onClick={on_click}>Unselect</Button></td>
    </tr>
}