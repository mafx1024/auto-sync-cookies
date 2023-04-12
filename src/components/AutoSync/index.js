/* eslint-disable */
import { Switch, Button, Form, Select, Input, Popconfirm, Table, message } from 'antd';
import React, { useContext, useEffect, useRef, useState } from 'react';
import useStorage, { addProtocol, removeProtocol } from './../../hooks/useStorage';
const EditableContext = React.createContext(null);

const EditableRow = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

const EditableCell = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  const form = useContext(EditableContext);

  useEffect(() => {
    if (editing) {
      inputRef.current.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({
      [dataIndex]: record[dataIndex]
    });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      toggleEdit();
      handleSave({
        ...record,
        ...values
      });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{
          margin: 0
        }}
        name={dataIndex}
        rules={[
          {
            required: true,
            message: `${title} is required.`
          }
        ]}
      >
        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
      </Form.Item>
    ) : (
      <div
        className='editable-cell-value-wrap'
        style={{
          paddingRight: 24
        }}
        onClick={toggleEdit}
      >
        {children}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};
const AutoSync = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { getStorage, setStorage } = useStorage();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [count, setCount] = useState(0);

  const handleDelete = (id) => {
    const newData = dataSource.filter((item) => item.id !== id);
    setDataSource(newData);
    setStorage(newData);
    setCount(count > 0 ? count - 1 : 0);
  };

  const handleAdd = () => {
    const newData = {
      id: count,
      source: `pre-sspmng.alibaba-inc.com`,
      isAuto: true,
      cookieNameList: ['sspmng_USER_COOKIE', 'sspmng_SSO_TOKEN_V2'],
      target: `localhost`
    };

    setStorage([...dataSource, newData]);
    setDataSource([...dataSource, newData]);
    setCount(count + 1);
  };

  const handleSave = (row) => {
    const newData = [...dataSource];
    const index = newData.findIndex((item) => row.id === item.id);
    const item = newData[index];

    newData.splice(index, 1, {
      ...item,
      ...row
    });

    setStorage(newData);
    setDataSource(newData);
  };

  const handleUpdate = async (record) => {
    const { source, target, cookieNameList = [] } = record;

    setLoading(true);
    cookieNameList.forEach(async (name, index) => {
      const cookie = await chrome.cookies.get({
        url: addProtocol(source),
        name
      });

      chrome.cookies
        .set({
          url: addProtocol(target),
          domain: removeProtocol(target),
          name,
          path: '/',
          value: cookie.value
        })
        .then(
          (res) => {
            if (cookieNameList.length - 1 === index) {
              messageApi.success('更新成功');
            }
          },
          (error) => {
            if (cookieNameList.length - 1 === index) {
              messageApi.error('更新失败');
            }
          }
        );
    });
    setLoading(false);
  };

  const handleSwitchChange = (value, record) => {
    const changeSource = dataSource.map((item) => {
      if (item.id !== record.id) return item;

      return { ...item, isAuto: value };
    });

    setStorage(changeSource);
    setDataSource(changeSource);
  };

  const handleSelectChange = (value, record) => {
    console.log(value, 'select value');
    const changeSource = dataSource.map((item) => {
      if (item.id !== record.id) return item;

      return { ...item, cookieNameList: value };
    });

    setStorage(changeSource);
    setDataSource(changeSource);
  };

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell
    }
  };

  const defaultColumns = [
    {
      title: '源地址',
      dataIndex: 'source',
      width: 240,
      editable: true
    },
    {
      title: '同步的cookie值',
      dataIndex: 'cookieNameList',
      width: 130,
      render: (data, record) => (
        <Select
          width={'130px'}
          value={data}
          mode={'tags'}
          onChange={(value) => handleSelectChange(value, record)}
          maxTagCount={2}
        />
      )
    },
    {
      title: '自动同步',
      dataIndex: 'isAuto',
      width: 120,
      render: (data, record) => (
        <Switch checked={data} onChange={(value) => handleSwitchChange(value, record)} />
      )
    },
    {
      title: '目标地址',
      dataIndex: 'target',
      width: 130,
      editable: true
    },
    {
      title: '操作',
      dataIndex: 'operation',
      width: 80,
      render: (_, record) => {
        return (
          <>
            <a onClick={() => handleUpdate(record)}>更新</a>
            {dataSource.length >= 1 && (
              <Popconfirm
                title='是否删除'
                cancelText='取消'
                okText='确认'
                onConfirm={() => handleDelete(record.id)}
              >
                <a>删除</a>
              </Popconfirm>
            )}
          </>
        );
      }
    }
  ];

  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave
      })
    };
  });

  useEffect(() => {
    getStorage().then((res = []) => {
      setDataSource(res);
      setCount(res.length);
    });
  }, []);

  return (
    <div className='auto-sync' style={{ width: 750, height: 500 }}>
      {dataSource.length <= 10 && (
        <Button
          onClick={handleAdd}
          type='primary'
          style={{
            marginBottom: 16
          }}
        >
          新增
        </Button>
      )}
      <Table
        loading={loading}
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns}
        pagination={false}
      />
      {contextHolder}
    </div>
  );
};
export default AutoSync;
