import React from "react";
import { Badge, Button, Col, Form, InputGroup, Row, Table, Spinner, Alert, Accordion, Card } from "react-bootstrap";
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { groupBy } from "../table_utils";
import APIBackend from '../RestAPI'
import { AddItemsPanel } from '../components/add_item_panel'
import { useNavigate } from "react-router-dom";

const get_url = (config) => ((config.db.host ? config.db.host : window.location.hostname) + (config.db.port ? ":" + config.db.port : ""))

export function WithdrawPage({ config }) {
    const queryClient = useQueryClient()
    let [location, setLocation] = React.useState(undefined)
    let [user, setUser] = React.useState("")
    let [allocation, setAllocation] = React.useState(undefined)

    let [selected_items, setSelectedItems] = React.useState({})

    let [outcome, setOutcome] = React.useState({})
    let [errors, setErrors] = React.useState({})
    let navigate = useNavigate()

    let url = get_url(config)

    const { isLoading, error, data } = useQuery(
        ['available_items', location?.id],
        () =>
            fetch('http://' + url + '/list/items/at/' + location?.id).then(res =>
                res.json()
            ),
        {
            // The query will not execute until the supplier exists
            enabled: !!location,
        }
    )

    const { isLoading: allocations_loading, data: allocations_dataset } = useQuery(
        ['allocation_dataset'],
        () =>
            fetch('http://' + url + '/list/allocations').then(res =>
                res.json()
            )
    )

    const create_mutation = useMutation(
        async (data) => {
            let url = "http://" + get_url(config) + "/action/withdraw"
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
                            ['available_items', location?.id]
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
            location: location?.id,
            withdrawn_by: user,
            allocation: allocation,
            items: Object.keys(selected_items).map(key => ({
                id: key,
                quantity: selected_items[key].withdraw_quantity
            }))
        })
    }

    console.log(location)

    let item_list = data
    if (allocation){
        let allocation_items = allocations_dataset.find(elem => elem.reference === allocation) || {allocated_items: []}
        item_list = item_list?.filter(elem => allocation_items.allocated_items.some(allocation_item => allocation_item.item_id === elem.id && allocation_item.remaining > 0))
        // cap the available quantity to the allocation remaining
        item_list = item_list?.map(elem => {
            let allocation_item = allocation_items.allocated_items.find(allocation_item => allocation_item.item_id === elem.id)
            return {
                ...elem,
                quantity: Math.min(elem.quantity, allocation_item.remaining)
            }
        })
        console.log(data,allocation_items,item_list)
    } 

    return <Card className="mt-3">
        <Card.Header>
            <div className="d-flex flex-row align-items-baseline justify-content-between flex-wrap">
                <h2>New Withdrawal</h2>
                <Button
                    variant="outline-secondary"
                    className="bi bi-arrow-left"
                    onClick={() => navigate("/")}
                >{" "}Back</Button>
            </div>
        </Card.Header>
        <Card.Body>
            <WithdrawalDetails setLocation={setLocation} config={config} user={user} setUser={setUser} allocation={allocation} setAllocation={setAllocation} />
            <AddItemsPanel
                selected_items={selected_items}
                setSelectedItems={setSelectedItems}
                item_list={item_list}
                available_title={"Available at \"" + (location?.name ?? "") + "\""}
                available_fields={[
                    { key: "name", label: "Item" },
                    { key: "quantity", label: "Units Available" },
                    { key: "$select$", label: "Withdraw" }
                ]}
                selected_title="Withdrawal Contents"
                selected_fields={[
                    { key: "name", label: "Item" },
                    { key: "quantity", label: "Units Available" },
                    { key: "#withdraw_quantity", label: "Units Withdrawn" },
                    { key: "$unselect$", label: "Remove" }
                ]}
                map_on_select={
                    [
                        {
                            value: 0,
                            to: "withdraw_quantity"
                        }
                    ]
                }
            />

            <div className="d-grid mt-2">
                <Button onClick={() => handleSubmit()} disabled={create_mutation.isPending || Object.keys(selected_items).length === 0}>Save</Button>
            </div>


            {create_mutation.isError ? (
                <Alert variant="danger">An error occurred: {create_mutation.error.message}</Alert>
            ) : null}


            {Object.keys(errors).length > 0 ? (
                <Alert variant="danger">Errors Occured: {JSON.stringify(errors)}</Alert>
            ) : null}
            
            {create_mutation.isSuccess && Object.keys(errors).length === 0 ?
                <Alert variant="success" className="d-flex align-items-baseline justify-content-between"><span>Withdrawn: {outcome.withdrawn.map(entry => <span>{entry.item} x {entry.quantity}  </span>)}</span>
                    <Button size="sm" variant="success" onClick={() => navigate('/')}>Close</Button></Alert>
                : null}
        </Card.Body>
    </Card>
}
function WithdrawalDetails({ setLocation, config, user, setUser, allocation, setAllocation }) {
    let [locked, setLocked] = React.useState(false)
    let [internal_location, setInternalLocation] = React.useState("")

    const { isLoading: allocations_loading, data: allocations_dataset } = useQuery(
        ['allocation_dataset'],
        () =>
            fetch('http://' + url + '/list/allocations').then(res =>
                res.json()
            )
    )

    let url = get_url(config)
    // const searchParams = new URLSearchParams();
    // searchParams.append("active", "true")
    const { isLoading, error, data: locations } = useQuery(
        ['withdraw_location_list'],
        () =>
            fetch('http://' + url + '/list/locations').then(res =>
                res.json()
            )
    )

    let on_lock = () => {
        if (internal_location !== "") {
            setLocked(true)
            setLocation(locations.find(elem => elem.id === internal_location)??undefined)
        } else
            window.alert("Please select the location from the dropdown")
    }

    let on_unlock = () => {
        if (confirm("Do you want to change the location - this will clear all items selected so far")) {
            setLocked(false)
            setLocation(undefined)
        }
    }

    if (isLoading || allocations_loading)
        return <Alert variant="secondary">Loading Location List <Spinner size="sm" /></Alert>

    if (error)
        return <Alert variant="danger">Error: Unable to Load Location List</Alert>

    return <div>
        <InputGroup>
            <InputGroup.Text>Inventory Location:</InputGroup.Text>
            <Form.Select value={internal_location} onChange={event => setInternalLocation(event.target.value)} disabled={locked}>
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
            <InputGroup.Text>Withdrawn By:</InputGroup.Text>
            <Form.Control value={user} onChange={(evt) => setUser(evt.target.value)} placeholder="Who is making this withdrawal? (Your Name)" />
        </InputGroup>
        <InputGroup className="mt-2">
            <InputGroup.Text>Withdrawn Against:</InputGroup.Text>
            <Form.Select value={allocation} onChange={event => setAllocation(event.target.value)}>
                <option value={""}>None</option>
                {allocations_dataset.map(entry => (
                    <option key={entry.id} value={entry.reference}>{entry.reference}</option>
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